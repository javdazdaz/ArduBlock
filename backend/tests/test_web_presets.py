"""
Tests de las rutas de presets web.

El endpoint es público y sirve archivos .html de examples/web/, así que los
casos cubren el parseo de metadatos, el listado y el bloqueo de rutas que
escapan del directorio base.
"""

from backend.routes import web_presets as presets_module


def _write(base, rel, content):
    target = base / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return target


def test_parse_meta_extrae_las_claves_del_primer_comentario():
    content = """<!--
    name: Landing del curso
    description: Página de presentación
    category: Educación
  -->
  <html></html>"""

    meta = presets_module._parse_meta(content)

    assert meta == {
        "name": "Landing del curso",
        "description": "Página de presentación",
        "category": "Educación",
    }


def test_parse_meta_devuelve_vacio_sin_comentario():
    assert presets_module._parse_meta("<html><body>hola</body></html>") == {}


def test_parse_meta_ignora_lineas_sin_dos_puntos():
    content = "<!--\nname: Uno\nlinea suelta\n--><html></html>"

    assert presets_module._parse_meta(content) == {"name": "Uno"}


def test_safe_web_path_resuelve_dentro_del_directorio(monkeypatch, tmp_path):
    monkeypatch.setattr(presets_module, "WEB_PRESETS_DIR", tmp_path)
    _write(tmp_path, "curso/index.html", "<html></html>")

    resolved = presets_module._safe_web_path("curso/index.html")

    assert resolved is not None
    assert resolved.is_file()


def test_safe_web_path_bloquea_escape(monkeypatch, tmp_path):
    monkeypatch.setattr(presets_module, "WEB_PRESETS_DIR", tmp_path / "web")
    (tmp_path / "web").mkdir()

    assert presets_module._safe_web_path("../secreto.html") is None
    assert presets_module._safe_web_path("/etc/passwd") is None


def test_safe_web_path_rechaza_vacio_y_caracteres_de_control(monkeypatch, tmp_path):
    monkeypatch.setattr(presets_module, "WEB_PRESETS_DIR", tmp_path)

    assert presets_module._safe_web_path("") is None
    assert presets_module._safe_web_path("a\x01b.html") is None


def test_list_web_presets_lee_nombre_descripcion_y_categoria(monkeypatch, tmp_path, client):
    monkeypatch.setattr(presets_module, "WEB_PRESETS_DIR", tmp_path)
    _write(tmp_path, "landing.html", "<!--\nname: Landing\ndescription: Portada\ncategory: Educación\n--><html></html>")
    _write(tmp_path, "curso/portada.html", "<!--\nname: Portada del curso\ncategory: Curso\n--><html></html>")
    _write(tmp_path, "sin-meta.html", "<html></html>")
    monkeypatch.setattr(presets_module, "WEB_PRESETS_DIR", tmp_path)

    resp = client.get("/api/web-presets")

    assert resp.status_code == 200
    items = {item["path"]: item for item in resp.get_json()}
    assert items["landing.html"] == {
        "path": "landing.html",
        "name": "Landing",
        "description": "Portada",
        "category": "Educación",
    }
    assert items["curso/portada.html"]["name"] == "Portada del curso"
    assert items["curso/portada.html"]["description"] == ""
    # Sin metadata, el nombre cae al stem y la categoría a General
    assert items["sin-meta.html"]["name"] == "sin-meta"
    assert items["sin-meta.html"]["category"] == "General"


def test_list_web_presets_ignora_ocultos_y_no_html(monkeypatch, tmp_path, client):
    monkeypatch.setattr(presets_module, "WEB_PRESETS_DIR", tmp_path)
    _write(tmp_path, ".borrador.html", "<!--\nname: Oculto\n--><html></html>")
    _write(tmp_path, "notas.txt", "texto")
    _write(tmp_path, "visible.html", "<html></html>")

    items = client.get("/api/web-presets").get_json()

    assert [item["path"] for item in items] == ["visible.html"]


def test_list_web_presets_devuelve_lista_vacia_si_falta_el_directorio(monkeypatch, tmp_path, client):
    monkeypatch.setattr(presets_module, "WEB_PRESETS_DIR", tmp_path / "no-existe")

    resp = client.get("/api/web-presets")

    assert resp.status_code == 200
    assert resp.get_json() == []


def test_get_web_preset_devuelve_el_contenido(monkeypatch, tmp_path, client):
    monkeypatch.setattr(presets_module, "WEB_PRESETS_DIR", tmp_path)
    _write(tmp_path, "curso/index.html", "<html>hola</html>")

    resp = client.get("/api/web-presets/curso/index.html")

    assert resp.status_code == 200
    data = resp.get_json()
    assert data["path"] == "curso/index.html"
    assert data["name"] == "index"
    assert data["content"] == "<html>hola</html>"


def test_get_web_preset_404_si_no_existe(monkeypatch, tmp_path, client):
    monkeypatch.setattr(presets_module, "WEB_PRESETS_DIR", tmp_path)

    resp = client.get("/api/web-presets/fantasma.html")

    assert resp.status_code == 404
    assert resp.get_json()["error"] == "Preset no encontrado"


def test_get_web_preset_rechaza_archivos_que_no_son_html(monkeypatch, tmp_path, client):
    monkeypatch.setattr(presets_module, "WEB_PRESETS_DIR", tmp_path)
    _write(tmp_path, "datos.txt", "secreto")

    resp = client.get("/api/web-presets/datos.txt")

    assert resp.status_code == 404


def test_get_web_preset_bloquea_path_traversal(monkeypatch, tmp_path, client):
    base = tmp_path / "web"
    base.mkdir()
    (tmp_path / "secreto.html").write_text("no deberías verme")
    monkeypatch.setattr(presets_module, "WEB_PRESETS_DIR", base)

    resp = client.get("/api/web-presets/../secreto.html")

    assert resp.status_code == 404
    assert "no deberías verme" not in resp.get_data(as_text=True)
