"""
ArduBlock — Auth + Dashboards (modelo Tinkercad)

Teacher: crea aulas con código de acceso.
Student: se registra con código de aula. Recibe email de bienvenida.
Password reset vía email.
"""

import hashlib
import os
import secrets
import smtplib
from email.mime.text import MIMEText
from datetime import timedelta
from urllib.parse import quote

from flask import Blueprint, g, render_template, request, redirect, url_for, flash, send_from_directory
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, EmailField
from wtforms.validators import DataRequired, Email, Length
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import func
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import IntegrityError

from backend.models import User, Classroom, ClassroomStudent, Project, Class, Activity, ClassActivity, utcnow
from backend.db import get_session
from backend.messages import get_message
from backend.config import FRONTEND_DIR
from backend.rate_limit import is_rate_limited

auth_bp = Blueprint("auth", __name__)
login_manager = LoginManager()

# ═══ Config ══════════════════════════════════════

TEACHER_EMAIL = os.environ.get("TEACHER_EMAIL", "").strip()
TEACHER_PASSWORD = os.environ.get("TEACHER_PASSWORD", "")

SMTP_HOST = os.environ.get("SMTP_HOST", "mail.mortem.technology")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")


def _hash_token(token: str) -> str:
    """Hash del token de reset (nunca se guarda el token en claro)."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# ═══ Email ═══════════════════════════════════════

def send_email(to: str, subject: str, body: str) -> bool:
    """Envía email vía SMTP. Retorna True si se envió."""
    if not SMTP_HOST:
        return False
    try:
        import uuid
        from email.mime.multipart import MIMEMultipart
        from email.utils import formataddr

        msg = MIMEMultipart("alternative")
        msg["Message-ID"] = f"<{uuid.uuid4()}@ardublock.matemancia.net>"
        msg["Subject"] = subject
        msg["From"] = formataddr(("ArduBlock", SMTP_USER or "ardublock@matemancia.net"))
        msg["To"] = to

        # Plain text fallback
        msg.attach(MIMEText(body, "plain", "utf-8"))
        # Simple HTML version
        html = f"""<html><body style="font-family:sans-serif;color:#eee;background:#1a1a2e;padding:20px">
<h2 style="color:#e94560">⚡ ArduBlock</h2>
<p style="white-space:pre-line">{body}</p>
<hr style="border-color:#333">
<p style="font-size:12px;color:#666">ArduBlock — Programación visual para Arduino</p>
</body></html>"""
        msg.attach(MIMEText(html, "html", "utf-8"))

        if SMTP_PORT == 465:
            s = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=10)
        else:
            s = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
            if SMTP_PORT != 25:
                s.starttls()
        if SMTP_USER and SMTP_PASS:
            s.login(SMTP_USER, SMTP_PASS)
        s.send_message(msg)
        s.quit()
        return True
    except Exception as e:
        import sys
        print(f"[EMAIL ERROR] {e}", file=sys.stderr)
        return False


# ═══ Forms ═══════════════════════════════════════

class LoginForm(FlaskForm):
    email = EmailField("Email", validators=[DataRequired(), Email()])
    password = PasswordField("Contraseña", validators=[DataRequired()])


class RegisterForm(FlaskForm):
    join_code = StringField("Código de clase", validators=[DataRequired(), Length(min=4, max=10)])
    name = StringField("Nombre completo", validators=[DataRequired(), Length(min=2, max=100)])
    email = EmailField("Email", validators=[DataRequired(), Email()])
    password = PasswordField("Contraseña", validators=[DataRequired(), Length(min=6)])


class CreateClassroomForm(FlaskForm):
    name = StringField("Nombre del curso", validators=[DataRequired(), Length(max=200)])


class RenameClassroomForm(FlaskForm):
    name = StringField("Nombre del curso", validators=[DataRequired(), Length(max=200)])


class EmptyForm(FlaskForm):
    """Form solo-CSRF para acciones destructivas (eliminar aula, quitar alumno)."""
    pass


class ClassNameForm(FlaskForm):
    name = StringField("Nombre de la clase", validators=[DataRequired(), Length(max=200)])


class ActivityForm(FlaskForm):
    name = StringField("Nombre de la actividad", validators=[DataRequired(), Length(max=200)])


class EditStudentForm(FlaskForm):
    name = StringField("Nombre", validators=[DataRequired(), Length(min=2, max=100)])
    email = EmailField("Email", validators=[DataRequired(), Email()])


class ProjectEditForm(FlaskForm):
    name = StringField("Nombre", validators=[DataRequired(), Length(max=100)])


class ResetRequestForm(FlaskForm):
    email = EmailField("Email", validators=[DataRequired(), Email()])


class ResetPasswordForm(FlaskForm):
    password = PasswordField("Nueva contraseña", validators=[DataRequired(), Length(min=6)])


# ═══ Login Manager ═══════════════════════════════

def init_auth(app, session_factory):
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"

    @login_manager.user_loader
    def load_user(user_id):
        s = session_factory()
        try:
            return s.get(User, int(user_id))
        finally:
            s.close()


# ═══ Helpers ════════════════════════════════════

def _get_session():
    """Sesión única compartida (backend.db)."""
    return get_session()


def _student_enrolled_in_teacher_classroom(s, student_id) -> bool:
    """True si el alumno está matriculado en alguna aula del profesor actual."""
    return (
        s.query(ClassroomStudent)
        .join(Classroom, Classroom.id == ClassroomStudent.classroom_id)
        .filter(
            Classroom.teacher_id == current_user.id,
            ClassroomStudent.user_id == student_id,
        )
        .first()
        is not None
    )


def _ensure_teacher():
    if not TEACHER_EMAIL or not TEACHER_PASSWORD:
        import sys
        print(
            "[WARN] TEACHER_EMAIL / TEACHER_PASSWORD sin definir: no se crea "
            "cuenta teacher por defecto.",
            file=sys.stderr,
        )
        return
    s = _get_session()
    try:
        if not s.query(User).filter_by(role="teacher").first():
            s.add(User(
                email=TEACHER_EMAIL, name="Profesor",
                password_hash=generate_password_hash(TEACHER_PASSWORD),
                role="teacher",
            ))
            s.commit()
    finally:
        s.close()


# ═══ Auth routes ═════════════════════════════════

@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("auth.dashboard"))
    form = LoginForm()
    if request.method == "POST" and is_rate_limited(
        f"login:{request.remote_addr}:{(request.form.get('email') or '').strip().lower()}",
        10,
        60,
    ):
        flash(get_message(g.lang, "rate_limited"), "error")
        return render_template("login.html", form=form)
    if form.validate_on_submit():
        s = _get_session()
        try:
            user = s.query(User).filter_by(
                email=form.email.data.strip().lower()
            ).first()
            if user and check_password_hash(user.password_hash, form.password.data):
                login_user(user, remember=True)
                return redirect(url_for("auth.dashboard"))
        finally:
            s.close()
        flash(get_message(g.lang, "invalid_credentials"), "error")
    return render_template("login.html", form=form)


@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("auth.dashboard"))
    form = RegisterForm()
    if request.method == "POST" and is_rate_limited(
        f"register:{request.remote_addr}", 20, 60
    ):
        flash(get_message(g.lang, "rate_limited"), "error")
        return render_template("register.html", form=form)
    if form.validate_on_submit():
        code = form.join_code.data.strip().upper()
        email = form.email.data.strip().lower()
        name = form.name.data.strip()
        s = _get_session()
        try:
            classroom = s.query(Classroom).filter_by(join_code=code).first()
            if not classroom:
                flash(get_message(g.lang, "invalid_class_code"), "error")
                return render_template("register.html", form=form)
            if s.query(User).filter_by(email=email).first():
                flash(get_message(g.lang, "email_registered"), "error")
                return render_template("register.html", form=form)

            user = User(
                email=email, name=name,
                password_hash=generate_password_hash(form.password.data),
                role="student",
            )
            s.add(user)
            s.flush()
            s.add(ClassroomStudent(classroom_id=classroom.id, user_id=user.id))
            try:
                s.commit()
            except IntegrityError:
                s.rollback()
                flash(get_message(g.lang, "email_registered"), "error")
                return render_template("register.html", form=form)

            # Welcome email
            send_email(
                email,
                get_message(g.lang, "welcome_subject", name=name),
                get_message(g.lang, "welcome_body",
                            name=name, classroom=classroom.name,
                            teacher=classroom.teacher.name),
            )

            login_user(user, remember=True)
            return redirect(url_for("auth.dashboard"))
        finally:
            s.close()
    return render_template("register.html", form=form)


@auth_bp.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("frontpage"))


@auth_bp.route("/dashboard")
@login_required
def dashboard():
    """Dashboard unificado: mismo layout, funciones según rol."""
    s = _get_session()
    try:
        if current_user.is_teacher:
            form = CreateClassroomForm()
            classrooms = (
                s.query(Classroom)
                .filter_by(teacher_id=current_user.id)
                .order_by(Classroom.created_at.desc())
                .all()
            )
            for c in classrooms:
                _ = len(c.students)
            projects = (
                s.query(Project)
                .filter_by(user_id=current_user.id)
                .order_by(Project.updated_at.desc())
                .all()
            )
            return render_template(
                "dashboard.html",
                user=current_user, classrooms=classrooms, projects=projects,
                unassigned=[], form=form,
            )
        else:
            classrooms = (
                s.query(Classroom)
                .join(ClassroomStudent, ClassroomStudent.classroom_id == Classroom.id)
                .filter(ClassroomStudent.user_id == current_user.id)
                .options(joinedload(Classroom.teacher))
                .order_by(Classroom.created_at.desc())
                .all()
            )
            unassigned = (
                s.query(Project)
                .filter_by(user_id=current_user.id, class_id=None)
                .order_by(Project.updated_at.desc())
                .all()
            )
            return render_template(
                "dashboard.html",
                user=current_user, classrooms=classrooms, unassigned=unassigned,
                projects=[], form=None,
            )
    finally:
        s.close()


# ═══ Password reset ══════════════════════════════

@auth_bp.route("/reset", methods=["GET", "POST"])
def reset_request():
    if current_user.is_authenticated:
        return redirect(url_for("auth.dashboard"))
    form = ResetRequestForm()
    if form.validate_on_submit():
        email = form.email.data.strip().lower()
        s = _get_session()
        try:
            user = s.query(User).filter_by(email=email).first()
            if user:
                token = secrets.token_urlsafe(32)
                user.reset_token = _hash_token(token)
                user.reset_token_expires = utcnow() + timedelta(hours=1)
                s.commit()
                reset_url = url_for("auth.reset_password", token=token, _external=True)
                if send_email(
                    email,
                    get_message(g.lang, "reset_email_subject"),
                    get_message(g.lang, "reset_email_body",
                                name=user.name, url=reset_url),
                ):
                    flash(get_message(g.lang, "reset_sent"), "success")
                else:
                    flash(get_message(g.lang, "reset_failed"), "error")
            else:
                flash(get_message(g.lang, "reset_if_exists"), "success")
        finally:
            s.close()
        return redirect(url_for("auth.login"))
    return render_template("reset_request.html", form=form)


@auth_bp.route("/reset/<token>", methods=["GET", "POST"])
def reset_password(token):
    if current_user.is_authenticated:
        return redirect(url_for("auth.dashboard"))

    def _valid_user():
        """Usuario válido para este token (existe y no expirado)."""
        s = _get_session()
        try:
            user = s.query(User).filter_by(reset_token=_hash_token(token)).first()
            if not user or not user.reset_token_expires or user.reset_token_expires < utcnow():
                return None
            return user
        finally:
            s.close()

    form = ResetPasswordForm()
    if form.validate_on_submit():
        user = _valid_user()
        if not user:
            flash(get_message(g.lang, "reset_invalid"), "error")
            return redirect(url_for("auth.reset_request"))
        s = _get_session()
        try:
            user = s.get(User, user.id)
            user.password_hash = generate_password_hash(form.password.data)
            user.reset_token = None
            user.reset_token_expires = None
            s.commit()
            flash(get_message(g.lang, "password_updated"), "success")
            return redirect(url_for("auth.login"))
        finally:
            s.close()

    if not _valid_user():
        flash(get_message(g.lang, "reset_invalid"), "error")
        return redirect(url_for("auth.reset_request"))
    return render_template("reset_password.html", form=form)


# ═══ Teacher dashboard ═══════════════════════════

@auth_bp.route("/teacher")
@login_required
def teacher_dashboard():
    return redirect(url_for("auth.dashboard"))


@auth_bp.route("/teacher/projects")
@login_required
def teacher_projects():
    """Dashboard de proyectos propios del docente (para asignar como referencia)."""
    if not current_user.is_teacher:
        return redirect(url_for("auth.dashboard"))
    s = _get_session()
    try:
        projects = (
            s.query(Project)
            .filter_by(user_id=current_user.id)
            .order_by(Project.updated_at.desc())
            .all()
        )
    finally:
        s.close()
    return render_template(
        "teacher_projects.html",
        user=current_user, projects=projects,
    )


@auth_bp.route("/teacher/classrooms", methods=["POST"])
@login_required
def create_classroom():
    if not current_user.is_teacher:
        return redirect(url_for("auth.dashboard"))
    form = CreateClassroomForm()
    if form.validate_on_submit():
        s = _get_session()
        try:
            code = Classroom.generate_code()
            for _ in range(10):
                if not s.query(Classroom).filter_by(join_code=code).first():
                    break
                code = Classroom.generate_code()
            classroom = Classroom(
                name=form.name.data.strip(),
                join_code=code,
                teacher_id=current_user.id,
            )
            s.add(classroom)
            s.commit()
            flash(get_message(g.lang, "classroom_created", code=classroom.join_code), "success")
        finally:
            s.close()
    return redirect(url_for("auth.teacher_dashboard"))


@auth_bp.route("/teacher/classroom/<int:classroom_id>")
@login_required
def view_classroom(classroom_id):
    if not current_user.is_teacher:
        return redirect(url_for("auth.dashboard"))
    rename_form = RenameClassroomForm()
    delete_form = EmptyForm()
    class_form = ClassNameForm()
    s = _get_session()
    try:
        classroom = s.get(Classroom, classroom_id)
        if not classroom or classroom.teacher_id != current_user.id:
            flash(get_message(g.lang, "classroom_not_found"), "error")
            return redirect(url_for("auth.teacher_dashboard"))
        classes = (
            s.query(Class)
            .filter_by(classroom_id=classroom_id)
            .order_by(Class.created_at.asc())
            .all()
        )
        students = (
            s.query(User)
            .join(ClassroomStudent)
            .filter(ClassroomStudent.classroom_id == classroom_id)
            .order_by(User.name.asc())
            .all()
        )
    finally:
        s.close()
    return render_template(
        "classroom_view.html",
        classroom=classroom, students=students, classes=classes, user=current_user,
        rename_form=rename_form, delete_form=delete_form, class_form=class_form,
    )


@auth_bp.route("/teacher/classroom/<int:classroom_id>/rename", methods=["POST"])
@login_required
def rename_classroom(classroom_id):
    if not current_user.is_teacher:
        return redirect(url_for("auth.dashboard"))
    form = RenameClassroomForm()
    s = _get_session()
    try:
        classroom = s.get(Classroom, classroom_id)
        if not classroom or classroom.teacher_id != current_user.id:
            flash(get_message(g.lang, "classroom_not_found"), "error")
            return redirect(url_for("auth.teacher_dashboard"))
        if form.validate_on_submit():
            classroom.name = form.name.data.strip()
            s.commit()
            flash(get_message(g.lang, "classroom_renamed"), "success")
    finally:
        s.close()
    return redirect(url_for("auth.view_classroom", classroom_id=classroom_id))


@auth_bp.route("/teacher/classroom/<int:classroom_id>/delete", methods=["POST"])
@login_required
def delete_classroom(classroom_id):
    if not current_user.is_teacher:
        return redirect(url_for("auth.dashboard"))
    form = EmptyForm()
    s = _get_session()
    try:
        classroom = s.get(Classroom, classroom_id)
        if not classroom or classroom.teacher_id != current_user.id:
            flash(get_message(g.lang, "classroom_not_found"), "error")
            return redirect(url_for("auth.teacher_dashboard"))
        if form.validate_on_submit():
            s.query(ClassroomStudent).filter_by(classroom_id=classroom_id).delete()
            s.delete(classroom)
            s.commit()
            flash(get_message(g.lang, "classroom_deleted"), "success")
            return redirect(url_for("auth.teacher_dashboard"))
    finally:
        s.close()
    return redirect(url_for("auth.view_classroom", classroom_id=classroom_id))


@auth_bp.route("/teacher/classroom/<int:classroom_id>/students/<int:student_id>/remove", methods=["POST"])
@login_required
def remove_student(classroom_id, student_id):
    if not current_user.is_teacher:
        return redirect(url_for("auth.dashboard"))
    form = EmptyForm()
    s = _get_session()
    try:
        classroom = s.get(Classroom, classroom_id)
        if not classroom or classroom.teacher_id != current_user.id:
            flash(get_message(g.lang, "classroom_not_found"), "error")
            return redirect(url_for("auth.teacher_dashboard"))
        if form.validate_on_submit():
            s.query(ClassroomStudent).filter_by(
                classroom_id=classroom_id, user_id=student_id
            ).delete()
            s.commit()
            flash(get_message(g.lang, "student_removed"), "success")
    finally:
        s.close()
    return redirect(url_for("auth.view_classroom", classroom_id=classroom_id))


# ═══ Clases (dentro de un curso) ══════════════════

@auth_bp.route("/teacher/classroom/<int:classroom_id>/classes", methods=["POST"])
@login_required
def create_class(classroom_id):
    if not current_user.is_teacher:
        return redirect(url_for("auth.dashboard"))
    form = ClassNameForm()
    s = _get_session()
    try:
        classroom = s.get(Classroom, classroom_id)
        if not classroom or classroom.teacher_id != current_user.id:
            flash(get_message(g.lang, "classroom_not_found"), "error")
            return redirect(url_for("auth.teacher_dashboard"))
        if form.validate_on_submit():
            s.add(Class(name=form.name.data.strip(), classroom_id=classroom.id))
            s.commit()
            flash(get_message(g.lang, "class_created"), "success")
    finally:
        s.close()
    return redirect(url_for("auth.view_classroom", classroom_id=classroom_id))


@auth_bp.route("/teacher/class/<int:class_id>")
@login_required
def view_class(class_id):
    if not current_user.is_teacher:
        return redirect(url_for("auth.dashboard"))
    rename_form = ClassNameForm()
    delete_form = EmptyForm()
    s = _get_session()
    try:
        cls = s.get(Class, class_id)
        if not cls or cls.classroom.teacher_id != current_user.id:
            flash(get_message(g.lang, "classroom_not_found"), "error")
            return redirect(url_for("auth.teacher_dashboard"))
        students = (
            s.query(User)
            .join(ClassroomStudent)
            .filter(ClassroomStudent.classroom_id == cls.classroom_id)
            .order_by(User.name.asc())
            .all()
        )
        student_ids = [st.id for st in students]
        counts = dict(
            s.query(Project.user_id, func.count(Project.id))
            .filter(Project.class_id == class_id, Project.user_id.in_(student_ids))
            .group_by(Project.user_id)
            .all()
        ) if student_ids else {}
        activities = (
            s.query(Activity)
            .join(ClassActivity, ClassActivity.activity_id == Activity.id)
            .filter(ClassActivity.class_id == class_id)
            .options(joinedload(Activity.reference_project))
            .order_by(Activity.created_at.asc())
            .all()
        )
        assigned_ids = [a.id for a in activities]
        library = (
            s.query(Activity)
            .filter_by(teacher_id=current_user.id)
            .order_by(Activity.created_at.asc())
            .all()
        )
        library = [a for a in library if a.id not in assigned_ids]
    finally:
        s.close()
    return render_template(
        "class_view.html",
        cls=cls, students=students, counts=counts, user=current_user,
        activities=activities, library=library,
        rename_form=rename_form, delete_form=delete_form,
    )


@auth_bp.route("/teacher/class/<int:class_id>/student/<int:student_id>")
@login_required
def view_class_student(class_id, student_id):
    if not current_user.is_teacher:
        return redirect(url_for("auth.dashboard"))
    s = _get_session()
    try:
        cls = s.get(Class, class_id)
        if not cls or cls.classroom.teacher_id != current_user.id:
            flash(get_message(g.lang, "classroom_not_found"), "error")
            return redirect(url_for("auth.teacher_dashboard"))
        enrolled = (
            s.query(ClassroomStudent)
            .filter_by(classroom_id=cls.classroom_id, user_id=student_id)
            .first()
        )
        if not enrolled:
            flash(get_message(g.lang, "classroom_not_found"), "error")
            return redirect(url_for("auth.view_class", class_id=class_id))
        student = s.get(User, student_id)
        projects = (
            s.query(Project)
            .filter_by(user_id=student_id, class_id=class_id)
            .order_by(Project.updated_at.desc())
            .all()
        )
    finally:
        s.close()
    return render_template(
        "class_student.html",
        cls=cls, student=student, projects=projects, user=current_user,
    )


@auth_bp.route("/teacher/class/<int:class_id>/rename", methods=["POST"])
@login_required
def rename_class(class_id):
    if not current_user.is_teacher:
        return redirect(url_for("auth.dashboard"))
    form = ClassNameForm()
    s = _get_session()
    try:
        cls = s.get(Class, class_id)
        if not cls or cls.classroom.teacher_id != current_user.id:
            flash(get_message(g.lang, "classroom_not_found"), "error")
            return redirect(url_for("auth.teacher_dashboard"))
        if form.validate_on_submit():
            cls.name = form.name.data.strip()
            s.commit()
            flash(get_message(g.lang, "class_renamed"), "success")
    finally:
        s.close()
    return redirect(url_for("auth.view_class", class_id=class_id))


@auth_bp.route("/teacher/class/<int:class_id>/delete", methods=["POST"])
@login_required
def delete_class(class_id):
    if not current_user.is_teacher:
        return redirect(url_for("auth.dashboard"))
    form = EmptyForm()
    s = _get_session()
    try:
        cls = s.get(Class, class_id)
        if not cls or cls.classroom.teacher_id != current_user.id:
            flash(get_message(g.lang, "classroom_not_found"), "error")
            return redirect(url_for("auth.teacher_dashboard"))
        if form.validate_on_submit():
            s.query(Project).filter_by(class_id=class_id).update({"class_id": None})
            s.query(ClassActivity).filter_by(class_id=class_id).delete()
            s.delete(cls)
            s.commit()
            flash(get_message(g.lang, "class_deleted"), "success")
            return redirect(url_for("auth.view_classroom", classroom_id=cls.classroom_id))
    finally:
        s.close()
    return redirect(url_for("auth.view_class", class_id=class_id))


# ═══ Actividades del curso ═══════════════════════

def _valid_reference_project(s, reference_id):
    """Valida que el proyecto de referencia sea del docente actual. Retorna None si no."""
    if reference_id is None:
        return None
    p = s.get(Project, reference_id)
    if not p or p.user_id != current_user.id:
        return None
    return p


@auth_bp.route("/teacher/activities")
@login_required
def teacher_activities():
    """Biblioteca de actividades del docente (reutilizables entre clases)."""
    if not current_user.is_teacher:
        return redirect(url_for("auth.dashboard"))
    form = ActivityForm()
    s = _get_session()
    try:
        activities = (
            s.query(Activity)
            .filter_by(teacher_id=current_user.id)
            .options(joinedload(Activity.reference_project))
            .order_by(Activity.created_at.asc())
            .all()
        )
        my_projects = (
            s.query(Project)
            .filter_by(user_id=current_user.id)
            .order_by(Project.updated_at.desc())
            .all()
        )
    finally:
        s.close()
    return render_template(
        "teacher_activities.html",
        user=current_user, activities=activities, my_projects=my_projects, form=form,
    )


@auth_bp.route("/teacher/activities", methods=["POST"])
@login_required
def create_activity():
    if not current_user.is_teacher:
        return redirect(url_for("auth.dashboard"))
    form = ActivityForm()
    s = _get_session()
    try:
        if form.validate_on_submit():
            ref = _valid_reference_project(s, request.form.get("reference_project_id", type=int))
            activity = Activity(
                teacher_id=current_user.id,
                name=form.name.data.strip(),
                reference_project_id=ref.id if ref else None,
            )
            s.add(activity)
            s.commit()
            flash(get_message(g.lang, "activity_created"), "success")
    finally:
        s.close()
    return redirect(url_for("auth.teacher_activities"))


@auth_bp.route("/teacher/activities/<int:activity_id>/edit", methods=["POST"])
@login_required
def edit_activity(activity_id):
    if not current_user.is_teacher:
        return redirect(url_for("auth.dashboard"))
    form = ActivityForm()
    s = _get_session()
    try:
        activity = s.get(Activity, activity_id)
        if not activity or activity.teacher_id != current_user.id:
            flash(get_message(g.lang, "activity_not_found"), "error")
            return redirect(url_for("auth.teacher_activities"))
        if form.validate_on_submit():
            activity.name = form.name.data.strip()
            ref = _valid_reference_project(s, request.form.get("reference_project_id", type=int))
            activity.reference_project_id = ref.id if ref else None
            s.commit()
            flash(get_message(g.lang, "activity_updated"), "success")
    finally:
        s.close()
    return redirect(url_for("auth.teacher_activities"))


@auth_bp.route("/teacher/activities/<int:activity_id>/delete", methods=["POST"])
@login_required
def delete_activity(activity_id):
    if not current_user.is_teacher:
        return redirect(url_for("auth.dashboard"))
    form = EmptyForm()
    s = _get_session()
    try:
        activity = s.get(Activity, activity_id)
        if not activity or activity.teacher_id != current_user.id:
            flash(get_message(g.lang, "activity_not_found"), "error")
            return redirect(url_for("auth.teacher_activities"))
        if form.validate_on_submit():
            s.query(ClassActivity).filter_by(activity_id=activity_id).delete()
            s.delete(activity)
            s.commit()
            flash(get_message(g.lang, "activity_deleted"), "success")
    finally:
        s.close()
    return redirect(url_for("auth.teacher_activities"))


@auth_bp.route("/teacher/class/<int:class_id>/activities", methods=["POST"])
@login_required
def assign_activity(class_id):
    """Asigna una actividad de la biblioteca a una clase."""
    if not current_user.is_teacher:
        return redirect(url_for("auth.dashboard"))
    form = EmptyForm()
    s = _get_session()
    try:
        cls = s.get(Class, class_id)
        if not cls or cls.classroom.teacher_id != current_user.id:
            flash(get_message(g.lang, "classroom_not_found"), "error")
            return redirect(url_for("auth.teacher_dashboard"))
        if form.validate_on_submit():
            aid = request.form.get("activity_id", type=int)
            activity = s.get(Activity, aid) if aid else None
            if not activity or activity.teacher_id != current_user.id:
                flash(get_message(g.lang, "activity_not_found"), "error")
            elif not s.query(ClassActivity).filter_by(class_id=class_id, activity_id=aid).first():
                s.add(ClassActivity(class_id=class_id, activity_id=aid))
                s.commit()
                flash(get_message(g.lang, "activity_assigned"), "success")
            else:
                flash(get_message(g.lang, "activity_already_assigned"), "error")
    finally:
        s.close()
    return redirect(url_for("auth.view_class", class_id=class_id))


@auth_bp.route("/teacher/class/<int:class_id>/activities/<int:activity_id>/remove", methods=["POST"])
@login_required
def unassign_activity(class_id, activity_id):
    """Quita una actividad de una clase (no borra la actividad de la biblioteca)."""
    if not current_user.is_teacher:
        return redirect(url_for("auth.dashboard"))
    form = EmptyForm()
    s = _get_session()
    try:
        cls = s.get(Class, class_id)
        if not cls or cls.classroom.teacher_id != current_user.id:
            flash(get_message(g.lang, "classroom_not_found"), "error")
            return redirect(url_for("auth.teacher_dashboard"))
        if form.validate_on_submit():
            s.query(ClassActivity).filter_by(class_id=class_id, activity_id=activity_id).delete()
            s.commit()
            flash(get_message(g.lang, "activity_unassigned"), "success")
    finally:
        s.close()
    return redirect(url_for("auth.view_class", class_id=class_id))


@auth_bp.route("/student/class/<int:class_id>/activities/<int:activity_id>/clone", methods=["POST"])
@login_required
def clone_activity(class_id, activity_id):
    """Estudiante: clona la actividad (su proyecto de referencia) a su cuenta."""
    if current_user.is_teacher:
        return redirect(url_for("auth.dashboard"))
    form = EmptyForm()
    back = url_for("auth.student_class", class_id=class_id)
    s = _get_session()
    try:
        if not form.validate_on_submit():
            return redirect(back)
        cls = s.get(Class, class_id)
        enrolled = (
            s.query(ClassroomStudent)
            .filter_by(classroom_id=cls.classroom_id, user_id=current_user.id)
            .first()
        ) if cls else None
        if not cls or not enrolled:
            return redirect(url_for("auth.dashboard"))
        assigned = (
            s.query(ClassActivity)
            .filter_by(class_id=class_id, activity_id=activity_id)
            .first()
        )
        activity = s.get(Activity, activity_id) if assigned else None
        ref = activity.reference_project if activity else None
        if not activity or not ref:
            flash(get_message(g.lang, "activity_no_reference"), "error")
            return redirect(back)
        name = (activity.name or ref.name or "").strip()[:100] or "Sin título"
        clone = Project(
            user_id=current_user.id,
            name=name,
            data=ref.data,
            board=ref.board,
            class_id=class_id,
            thumbnail=ref.thumbnail,
        )
        s.add(clone)
        s.commit()
        flash(get_message(g.lang, "activity_cloned"), "success")
        return redirect(f"/app?project={clone.id}&from={quote(back)}")
    finally:
        s.close()


@auth_bp.route("/teacher/regen-thumbnails")
@login_required
def teacher_regen_thumbnails():
    """Página de utilidad: regenera los thumbnails de los proyectos de los alumnos."""
    if not current_user.is_teacher:
        return redirect(url_for("auth.dashboard"))
    return send_from_directory(str(FRONTEND_DIR), "regen.html")


# ═══ Perfil de estudiante (vista docente) ═════════

@auth_bp.route("/teacher/student/<int:student_id>")
@login_required
def teacher_student_profile(student_id):
    if not current_user.is_teacher:
        return redirect(url_for("auth.dashboard"))
    from_classroom_id = request.args.get("from", type=int)
    back_url = url_for("auth.teacher_dashboard")
    s = _get_session()
    try:
        if not _student_enrolled_in_teacher_classroom(s, student_id):
            flash(get_message(g.lang, "classroom_not_found"), "error")
            return redirect(url_for("auth.teacher_dashboard"))
        # validar el curso de origen (para el botón "volver")
        if from_classroom_id:
            origin = s.get(Classroom, from_classroom_id)
            if origin and origin.teacher_id == current_user.id:
                back_url = url_for("auth.view_classroom", classroom_id=from_classroom_id)
            else:
                from_classroom_id = None
        student = s.get(User, student_id)
        projects = (
            s.query(Project)
            .filter_by(user_id=student_id)
            .order_by(Project.updated_at.desc())
            .all()
        )
        classes = (
            s.query(Class)
            .join(Classroom, Classroom.id == Class.classroom_id)
            .filter(Classroom.teacher_id == current_user.id)
            .order_by(Class.name.asc())
            .all()
        )
        class_names = {c.id: c.name for c in classes}
    finally:
        s.close()
    return render_template(
        "teacher_student_profile.html",
        student=student, projects=projects, classes=classes,
        class_names=class_names, user=current_user,
        account_form=EditStudentForm(obj=student),
        project_form=ProjectEditForm(),
        back_url=back_url, from_classroom_id=from_classroom_id,
    )


def _profile_redirect(student_id):
    """Redirige al perfil preservando el parámetro `from` (curso de origen)."""
    kwargs = {"student_id": student_id}
    from_id = request.args.get("from", type=int)
    if from_id:
        kwargs["from"] = from_id
    return redirect(url_for("auth.teacher_student_profile", **kwargs))


@auth_bp.route("/teacher/student/<int:student_id>/edit", methods=["POST"])
@login_required
def teacher_edit_student(student_id):
    if not current_user.is_teacher:
        return redirect(url_for("auth.dashboard"))
    form = EditStudentForm()
    s = _get_session()
    try:
        if not _student_enrolled_in_teacher_classroom(s, student_id):
            flash(get_message(g.lang, "classroom_not_found"), "error")
            return redirect(url_for("auth.teacher_dashboard"))
        student = s.get(User, student_id)
        if form.validate_on_submit():
            new_email = form.email.data.strip().lower()
            if new_email != student.email and s.query(User).filter_by(email=new_email).first():
                flash(get_message(g.lang, "email_registered"), "error")
            else:
                student.name = form.name.data.strip()
                student.email = new_email
                s.commit()
                flash(get_message(g.lang, "student_updated"), "success")
    finally:
        s.close()
    return _profile_redirect(student_id)


@auth_bp.route("/teacher/student/<int:student_id>/projects/<int:project_id>/edit", methods=["POST"])
@login_required
def teacher_edit_project(student_id, project_id):
    if not current_user.is_teacher:
        return redirect(url_for("auth.dashboard"))
    form = ProjectEditForm()
    s = _get_session()
    try:
        if not _student_enrolled_in_teacher_classroom(s, student_id):
            flash(get_message(g.lang, "classroom_not_found"), "error")
            return redirect(url_for("auth.teacher_dashboard"))
        p = s.get(Project, project_id)
        if not p or p.user_id != student_id:
            flash(get_message(g.lang, "project_not_found"), "error")
            return _profile_redirect(student_id)
        if form.validate_on_submit():
            p.name = form.name.data.strip()
            new_class_id = request.form.get("class_id", type=int)
            if new_class_id:
                cls = s.get(Class, new_class_id)
                if not cls or cls.classroom.teacher_id != current_user.id:
                    flash(get_message(g.lang, "class_not_found"), "error")
                    return _profile_redirect(student_id)
                p.class_id = new_class_id
            else:
                p.class_id = None
            s.commit()
            flash(get_message(g.lang, "project_updated"), "success")
    finally:
        s.close()
    return _profile_redirect(student_id)


# ═══ Student dashboard ═══════════════════════════

@auth_bp.route("/student")
@login_required
def student_dashboard():
    return redirect(url_for("auth.dashboard"))


@auth_bp.route("/student/classroom/<int:classroom_id>")
@login_required
def student_classroom(classroom_id):
    if current_user.is_teacher:
        return redirect(url_for("auth.teacher_dashboard"))
    s = _get_session()
    try:
        enrolled = (
            s.query(ClassroomStudent)
            .filter_by(classroom_id=classroom_id, user_id=current_user.id)
            .first()
        )
        if not enrolled:
            return redirect(url_for("auth.dashboard"))
        classroom = s.get(Classroom, classroom_id)
        classes = (
            s.query(Class)
            .filter_by(classroom_id=classroom_id)
            .order_by(Class.created_at.asc())
            .all()
        )
    finally:
        s.close()
    return render_template(
        "student_classroom.html",
        classroom=classroom, classes=classes, user=current_user,
    )


@auth_bp.route("/student/class/<int:class_id>")
@login_required
def student_class(class_id):
    if current_user.is_teacher:
        return redirect(url_for("auth.teacher_dashboard"))
    s = _get_session()
    try:
        cls = (
            s.query(Class)
            .options(joinedload(Class.classroom))
            .filter_by(id=class_id)
            .first()
        )
        if not cls:
            return redirect(url_for("auth.dashboard"))
        enrolled = (
            s.query(ClassroomStudent)
            .filter_by(classroom_id=cls.classroom_id, user_id=current_user.id)
            .first()
        )
        if not enrolled:
            return redirect(url_for("auth.dashboard"))
        projects = (
            s.query(Project)
            .filter_by(user_id=current_user.id, class_id=class_id)
            .order_by(Project.updated_at.desc())
            .all()
        )
        activities = (
            s.query(Activity)
            .join(ClassActivity, ClassActivity.activity_id == Activity.id)
            .filter(ClassActivity.class_id == class_id)
            .options(joinedload(Activity.reference_project))
            .order_by(Activity.created_at.asc())
            .all()
        )
    finally:
        s.close()
    return render_template(
        "student_class.html",
        cls=cls, projects=projects, activities=activities, user=current_user,
        clone_form=EmptyForm(),
    )
