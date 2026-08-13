"""
ArduBlock — Auth + Dashboards (modelo Tinkercad)

Teacher: crea aulas con código de acceso.
Student: se registra con código de aula. Recibe email de bienvenida.
Password reset vía email.
"""

import os
import secrets
import smtplib
from email.mime.text import MIMEText
from datetime import datetime, timedelta, timezone

from flask import Blueprint, g, render_template, request, redirect, url_for, flash
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, EmailField
from wtforms.validators import DataRequired, Email, Length
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.models import User, Classroom, ClassroomStudent, Project
from backend.config import DATABASE_PATH
from backend.messages import get_message

auth_bp = Blueprint("auth", __name__)
login_manager = LoginManager()

_engine = create_engine(f"sqlite:///{DATABASE_PATH}", echo=False)
_SessionFactory = sessionmaker(bind=_engine)

# ═══ Config ══════════════════════════════════════

TEACHER_EMAIL = os.environ.get("TEACHER_EMAIL", "teacher@example.com")
TEACHER_PASSWORD = os.environ.get("TEACHER_PASSWORD", "ardublock")

SMTP_HOST = os.environ.get("SMTP_HOST", "mail.mortem.technology")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")


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
    return _SessionFactory()


def _ensure_teacher():
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
            s.commit()

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
    if current_user.is_teacher:
        return redirect(url_for("auth.teacher_dashboard"))
    return redirect(url_for("auth.student_dashboard"))


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
                user.reset_token = token
                user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
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

    s = _get_session()
    try:
        user = s.query(User).filter_by(reset_token=token).first()
        if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
            flash(get_message(g.lang, "reset_invalid"), "error")
            return redirect(url_for("auth.reset_request"))
    finally:
        s.close()

    form = ResetPasswordForm()
    if form.validate_on_submit():
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

    return render_template("reset_password.html", form=form)


# ═══ Teacher dashboard ═══════════════════════════

@auth_bp.route("/teacher")
@login_required
def teacher_dashboard():
    if not current_user.is_teacher:
        return redirect(url_for("auth.dashboard"))
    form = CreateClassroomForm()
    s = _get_session()
    try:
        classrooms = (
            s.query(Classroom)
            .filter_by(teacher_id=current_user.id)
            .order_by(Classroom.created_at.desc())
            .all()
        )
        for c in classrooms:
            _ = len(c.students)
    finally:
        s.close()
    return render_template(
        "teacher_dashboard.html",
        user=current_user, classrooms=classrooms, form=form,
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
            classroom = Classroom(
                name=form.name.data.strip(),
                join_code=Classroom.generate_code(),
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
    s = _get_session()
    try:
        classroom = s.get(Classroom, classroom_id)
        if not classroom or classroom.teacher_id != current_user.id:
            flash(get_message(g.lang, "classroom_not_found"), "error")
            return redirect(url_for("auth.teacher_dashboard"))
        students = (
            s.query(User)
            .join(ClassroomStudent)
            .filter(ClassroomStudent.classroom_id == classroom_id)
            .all()
        )
    finally:
        s.close()
    return render_template(
        "classroom_view.html",
        classroom=classroom, students=students, user=current_user,
    )


# ═══ Student dashboard ═══════════════════════════

@auth_bp.route("/student")
@login_required
def student_dashboard():
    if current_user.is_teacher:
        return redirect(url_for("auth.teacher_dashboard"))
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
        "student_dashboard.html", user=current_user, projects=projects,
    )
