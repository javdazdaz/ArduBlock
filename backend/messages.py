"""
ArduBlock — Catálogo de mensajes (i18n)

Soporte español ↔ inglés para las plantillas Jinja, flash messages y emails.

Uso:
    from backend.messages import get_message
    get_message("es", "login_title")       # -> "Iniciar sesión"
    get_message("en", "students_count", n=5)  # -> "5 students"
"""

SUPPORTED_LANGS = ("es", "en")
DEFAULT_LANG = "es"

MESSAGES = {
    "es": {
        # ── Común / base ──
        "change_palette": "Cambiar paleta",
        "theme": "Tema",
        "language": "Idioma",
        # ── Login ──
        "login_title": "Iniciar sesión",
        "email": "Email",
        "password": "Contraseña",
        "no_account": "¿No tienes cuenta?",
        "register_link": "Regístrate",
        "forgot_password": "¿Olvidaste tu contraseña?",
        "rate_limited": "Demasiados intentos. Espere un momento e intente de nuevo.",
        # ── Register ──
        "register_title": "Crear cuenta",
        "full_name": "Nombre completo",
        "class_code_label": "Código de clase (lo da tu profesor)",
        "have_account": "¿Ya tienes cuenta?",
        "login_link": "Inicia sesión",
        # ── Reset ──
        "reset_title": "Recuperar contraseña",
        "reset_email_label": "Email de tu cuenta",
        "reset_send_button": "Enviar instrucciones",
        "back_to_login": "← Volver al login",
        "new_password_title": "Nueva contraseña",
        "new_password_label": "Nueva contraseña (mínimo 6 caracteres)",
        "change_password": "Cambiar contraseña",
        # ── Teacher dashboard ──
        "teacher_label": "Profesor",
        "editor_link": "Editor",
        "logout": "Salir",
        "new_classroom": "Nueva aula",
        "course_name_label": "Nombre del curso (ej: Robótica 2025 - 3°A)",
        "create_classroom": "Crear aula",
        "my_classrooms": "Mis aulas",
        "students_count": "%(n)s estudiantes",
        "no_classrooms": "No hay aulas todavía. Crea una arriba ↑",
        # ── Classroom view ──
        "back_my_classrooms": "← Mis aulas",
        "back": "← Volver",
        "share_code": "Comparte este código con tus estudiantes:",
        "students_enter": "Los estudiantes deben entrar a",
        "and_enter_code": "e ingresar este código junto con su nombre, email y contraseña.",
        "students_title": "Estudiantes",
        "no_students": "Ningún estudiante se ha unido todavía.",
        # ── Student dashboard ──
        "my_projects": "Mis proyectos",
        "new_project": "+ Nuevo proyecto",
        "no_projects": "Aún no tienes proyectos.",
        "first_project": "Crear mi primer proyecto",
        # ── Flash messages ──
        "invalid_credentials": "Email o contraseña incorrectos.",
        "invalid_class_code": "Código de clase inválido.",
        "email_registered": "Ese email ya está registrado.",
        "reset_sent": "Te hemos enviado un correo con instrucciones.",
        "reset_failed": "No se pudo enviar el correo. Intenta más tarde.",
        "reset_if_exists": "Si el email existe, recibirás instrucciones.",
        "reset_invalid": "Enlace inválido o expirado.",
        "password_updated": "Contraseña actualizada. Inicia sesión.",
        "classroom_created": "Aula creada. Código: %(code)s",
        "classroom_not_found": "Aula no encontrada.",
        "classroom_renamed": "Aula renombrada.",
        "classroom_deleted": "Aula eliminada.",
        "student_removed": "Estudiante quitado del aula.",
        "rename_classroom": "Renombrar aula",
        "rename": "Renombrar",
        "delete_classroom": "Eliminar aula",
        "remove_student": "Quitar",
        "confirm_delete_classroom": "¿Eliminar esta aula? Los estudiantes conservan sus cuentas y proyectos.",
        "confirm_remove_student": "¿Quitar a este estudiante del aula?",
        "copy_code": "Copiar código",
        "copied": "Código copiado",
        "student_projects": "Proyectos",
        "no_student_projects": "Sin proyectos todavía.",
        "classes": "Clases",
        "new_class": "Nueva clase",
        "create_class": "Crear clase",
        "class_name_label": "Nombre de la clase (ej: Clase 1: Sensores)",
        "rename_class": "Renombrar clase",
        "delete_class": "Eliminar clase",
        "confirm_delete_class": "¿Eliminar esta clase? Los proyectos de los estudiantes no se borran.",
        "class_created": "Clase creada.",
        "class_renamed": "Clase renombrada.",
        "class_deleted": "Clase eliminada.",
        "no_classes": "No hay clases todavía.",
        "my_courses": "Mis cursos",
        "no_courses": "No estás en ningún curso.",
        "back_to_class": "Volver a la clase",
        "unassigned_projects": "Proyectos sin clase",
        "view_projects": "Ver proyectos",
        "edit_account": "Editar cuenta",
        "account": "Cuenta",
        "save": "Guardar",
        "student_updated": "Datos del estudiante actualizados.",
        "project_updated": "Proyecto actualizado.",
        "project_not_found": "Proyecto no encontrado.",
        "class_not_found": "Clase no encontrada.",
        "location": "Clase",
        "no_class": "Sin clase",
        "open_editor": "Abrir",
        "view": "Ver",
        "edit": "Editar",
        "regen_thumbnails": "Regenerar thumbnails",
        # ── Actividades ──
        "activities": "Actividades",
        "new_activity": "Nueva actividad",
        "create_activity": "Crear actividad",
        "activity_name_label": "Nombre de la actividad",
        "reference_project": "Proyecto de referencia",
        "no_reference": "Sin referencia",
        "view_reference": "Ver referencia",
        "no_activities": "No hay actividades todavía.",
        "activity_created": "Actividad creada.",
        "activity_updated": "Actividad actualizada.",
        "activity_deleted": "Actividad eliminada.",
        "activity_not_found": "Actividad no encontrada.",
        "confirm_delete_activity": "¿Eliminar esta actividad?",
        "delete_activity": "Eliminar",
        "teacher_projects_hint": "Estos son tus proyectos guardados. Asígnalos como referencia a las actividades de tus cursos.",
        "no_teacher_projects": "Aún no tienes proyectos. Abre el editor y guarda uno.",
        "activity_library_hint": "Biblioteca de actividades: créalas una vez y asígnalas a tus clases.",
        "assign_activity": "Asignar",
        "unassign_activity": "Quitar",
        "activity_assigned": "Actividad asignada a la clase.",
        "activity_unassigned": "Actividad quitada de la clase.",
        "activity_already_assigned": "Esa actividad ya está en la clase.",
        "manage_activities_hint": "Gestiona tu biblioteca en",
        "no_activities_to_assign": "No quedan actividades sin asignar en tu biblioteca. Créalas en",
        # ── Emails ──
        "welcome_subject": "¡Bienvenido a ArduBlock, %(name)s!",
        "welcome_body": (
            "Hola %(name)s,\n\n"
            "Tu cuenta en ArduBlock ha sido creada.\n"
            "Aula: %(classroom)s\n"
            "Profesor: %(teacher)s\n\n"
            "Accede en: https://ardublock.matemancia.net/app\n\n"
            "— ArduBlock"
        ),
        "reset_email_subject": "Recuperación de contraseña — ArduBlock",
        "reset_email_body": (
            "Hola %(name)s,\n\n"
            "Para restablecer tu contraseña, visita:\n%(url)s\n\n"
            "Este enlace expira en 1 hora.\n\n"
            "— ArduBlock"
        ),
    },

    "en": {
        # ── Common / base ──
        "change_palette": "Change palette",
        "theme": "Theme",
        "language": "Language",
        # ── Login ──
        "login_title": "Log in",
        "email": "Email",
        "password": "Password",
        "no_account": "Don't have an account?",
        "register_link": "Sign up",
        "forgot_password": "Forgot your password?",
        "rate_limited": "Too many attempts. Wait a moment and try again.",
        # ── Register ──
        "register_title": "Create account",
        "full_name": "Full name",
        "class_code_label": "Class code (given by your teacher)",
        "have_account": "Already have an account?",
        "login_link": "Log in",
        # ── Reset ──
        "reset_title": "Reset password",
        "reset_email_label": "Account email",
        "reset_send_button": "Send instructions",
        "back_to_login": "← Back to login",
        "new_password_title": "New password",
        "new_password_label": "New password (minimum 6 characters)",
        "change_password": "Change password",
        # ── Teacher dashboard ──
        "teacher_label": "Teacher",
        "editor_link": "Editor",
        "logout": "Log out",
        "new_classroom": "New classroom",
        "course_name_label": "Course name (e.g. Robotics 2025 - 3A)",
        "create_classroom": "Create classroom",
        "my_classrooms": "My classrooms",
        "students_count": "%(n)s students",
        "no_classrooms": "No classrooms yet. Create one above ↑",
        # ── Classroom view ──
        "back_my_classrooms": "← My classrooms",
        "back": "← Back",
        "share_code": "Share this code with your students:",
        "students_enter": "Students must go to",
        "and_enter_code": "and enter this code along with their name, email and password.",
        "students_title": "Students",
        "no_students": "No students have joined yet.",
        # ── Student dashboard ──
        "my_projects": "My projects",
        "new_project": "+ New project",
        "no_projects": "You don't have any projects yet.",
        "first_project": "Create my first project",
        # ── Flash messages ──
        "invalid_credentials": "Incorrect email or password.",
        "invalid_class_code": "Invalid class code.",
        "email_registered": "That email is already registered.",
        "reset_sent": "We've sent you an email with instructions.",
        "reset_failed": "Couldn't send the email. Try again later.",
        "reset_if_exists": "If the email exists, you'll receive instructions.",
        "reset_invalid": "Invalid or expired link.",
        "password_updated": "Password updated. Log in.",
        "classroom_created": "Classroom created. Code: %(code)s",
        "classroom_not_found": "Classroom not found.",
        "classroom_renamed": "Classroom renamed.",
        "classroom_deleted": "Classroom deleted.",
        "student_removed": "Student removed from classroom.",
        "rename_classroom": "Rename classroom",
        "rename": "Rename",
        "delete_classroom": "Delete classroom",
        "remove_student": "Remove",
        "confirm_delete_classroom": "Delete this classroom? Students keep their accounts and projects.",
        "confirm_remove_student": "Remove this student from the classroom?",
        "copy_code": "Copy code",
        "copied": "Code copied",
        "student_projects": "Projects",
        "no_student_projects": "No projects yet.",
        "classes": "Classes",
        "new_class": "New class",
        "create_class": "Create class",
        "class_name_label": "Class name (e.g. Class 1: Sensors)",
        "rename_class": "Rename class",
        "delete_class": "Delete class",
        "confirm_delete_class": "Delete this class? Students' projects are not deleted.",
        "class_created": "Class created.",
        "class_renamed": "Class renamed.",
        "class_deleted": "Class deleted.",
        "no_classes": "No classes yet.",
        "my_courses": "My courses",
        "no_courses": "You're not in any course.",
        "back_to_class": "Back to class",
        "unassigned_projects": "Unassigned projects",
        "view_projects": "View projects",
        "edit_account": "Edit account",
        "account": "Account",
        "save": "Save",
        "student_updated": "Student details updated.",
        "project_updated": "Project updated.",
        "project_not_found": "Project not found.",
        "class_not_found": "Class not found.",
        "location": "Class",
        "no_class": "No class",
        "open_editor": "Open",
        "view": "View",
        "edit": "Edit",
        "regen_thumbnails": "Regenerate thumbnails",
        # ── Activities ──
        "activities": "Activities",
        "new_activity": "New activity",
        "create_activity": "Create activity",
        "activity_name_label": "Activity name",
        "reference_project": "Reference project",
        "no_reference": "No reference",
        "view_reference": "View reference",
        "no_activities": "No activities yet.",
        "activity_created": "Activity created.",
        "activity_updated": "Activity updated.",
        "activity_deleted": "Activity deleted.",
        "activity_not_found": "Activity not found.",
        "confirm_delete_activity": "Delete this activity?",
        "delete_activity": "Delete",
        "teacher_projects_hint": "These are your saved projects. Assign them as references to your courses' activities.",
        "no_teacher_projects": "You don't have any projects yet. Open the editor and save one.",
        "activity_library_hint": "Activity library: create them once and assign them to your classes.",
        "assign_activity": "Assign",
        "unassign_activity": "Remove",
        "activity_assigned": "Activity assigned to the class.",
        "activity_unassigned": "Activity removed from the class.",
        "activity_already_assigned": "That activity is already in the class.",
        "manage_activities_hint": "Manage your library in",
        "no_activities_to_assign": "No unassigned activities left in your library. Create them in",
        # ── Emails ──
        "welcome_subject": "Welcome to ArduBlock, %(name)s!",
        "welcome_body": (
            "Hi %(name)s,\n\n"
            "Your ArduBlock account has been created.\n"
            "Classroom: %(classroom)s\n"
            "Teacher: %(teacher)s\n\n"
            "Access it at: https://ardublock.matemancia.net/app\n\n"
            "— ArduBlock"
        ),
        "reset_email_subject": "Password reset — ArduBlock",
        "reset_email_body": (
            "Hi %(name)s,\n\n"
            "To reset your password, visit:\n%(url)s\n\n"
            "This link expires in 1 hour.\n\n"
            "— ArduBlock"
        ),
    },
}


def get_message(lang, key, **kwargs):
    """Devuelve el mensaje traducido para `key` en el idioma `lang`.

    Si el idioma no está soportado o falta la clave, devuelve la clave.
    Si se pasan kwargs, se aplica formato % a la plantilla.
    """
    table = MESSAGES.get(lang) or MESSAGES[DEFAULT_LANG]
    msg = table.get(key)
    if msg is None:
        return key
    if kwargs:
        try:
            return msg % kwargs
        except (TypeError, ValueError, KeyError):
            return msg
    return msg
