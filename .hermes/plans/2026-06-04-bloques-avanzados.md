# Plan: Versiones Avanzadas (_advanced) de Bloques ArduBlock

> **Para Hermes:** Implementar bloque por bloque usando este plan como guía.

**Objetivo:** Agregar variante `_advanced` a 18 bloques Arduino que actualmente solo tienen versiones intermedia o básica. La versión avanzada reemplaza `field_number`/`field_dropdown` por `input_value` con shadows, permitiendo usar variables o expresiones en lugar de valores fijos.

**Arquitectura:** Cada bloque se define como JSON en su archivo de categoría (`blocks/X.js`), se agrega un generador `valueToCode` en `registerGenerators()`, y se registra en el toolbox de `blocks.js` con `level: 3`.

**Completos (6 bloques, sin acción):** pin_mode, digital_write, digital_read, analog_read, delay_ms, tone_output

---

## Clasificación de Bloques que Necesitan _advanced

### A. Parámetros numéricos tipo pin → input_value (más comunes)

| # | Archivo | Bloque | Campo(s) a convertir |
|---|---------|--------|---------------------|
| 1 | analoga.js | analog_write | PIN (field_number → input_value) |
| 2 | avanzada.js | pulse_in | PIN, TIMEOUT (field_number → input_value) |
| 3 | avanzada.js | tone_duration | PIN (field_number → input_value; FREQ y DUR ya son input_value) |
| 4 | avanzada.js | no_tone_output | PIN (field_number → input_value) |
| 5 | avanzada.js | attach_interrupt | PIN (field_number → input_value) |
| 6 | serial.js | serial_begin | BAUD (field_dropdown → input_value con shadow 9600) |
| 7 | servo.js | servo_create | PIN (field_number → input_value) |
| 8 | servo.js | servo_write | ANGLE (field_angle → input_value con shadow field_angle 90) |
| 9 | servo.js | servo_write_us | US (field_number → input_value con shadow 1500) |
| 10 | sensores.js | dht_create | PIN (field_number → input_value) |
| 11 | sensores.js | ultrasonic_create | TRIG, ECHO (field_number → input_value) |
| 12 | lcd.js | lcd_create | RS, EN, D4, D5, D6, D7, COLS, ROWS (8 campos → input_value) |
| 13 | lcd.js | lcd_i2c_create | COLS, ROWS (field_number → input_value; ADDR se mantiene dropdown) |
| 14 | lcd.js | lcd_set_cursor | COL, ROW (field_number → input_value) |
| 15 | motor.js | stepper_create | STEPS, P1, P2, P3, P4 (5 campos → input_value) |
| 16 | motor.js | stepper_speed | RPM (field_number → input_value) |
| 17 | motor.js | stepper_step | COUNT (field_number → input_value) |
| 18 | matematicas.js | map_value | FROM_LOW, FROM_HIGH, TO_LOW, TO_HIGH (4 campos → input_value; VALUE ya es input_value) |

### B. Sin parámetros numéricos → NO necesitan _advanced

arduino_setup, arduino_loop, include_header, millis, serial_available, serial_read, serial_parse_int, serial_parse_float, serial_read_string, serial_print, serial_println, serial_write, lcd_print, lcd_clear, dht_temp, dht_humidity, ultrasonic_read

---

## Patrón de Implementación

### Definición de bloque (_advanced)

```json
{
    "type": "X_advanced",
    "message0": "Mismo Blockly.Msg que el intermedio",
    "args0": [
      { "type": "input_value", "name": "PIN", "check": "Number" },
      // Mantener field_dropdown para opciones semánticas (MODE, VALUE, TYPE)
      { "type": "field_dropdown", "name": "MODE", "options": [...] }
    ],
    "previousStatement": null,  // o "output": "Number" si es value block
    "nextStatement": null,
    "colour": MISMO_COLOR_QUE_INTERMEDIO,
    "tooltip": "Nivel Avanzado. Los valores numéricos pueden ser variables o expresiones.",
    "helpUrl": ""
}
```

### Generador (_advanced)

```javascript
cppGenerator.forBlock['X_advanced'] = function(block) {
  const pin = cppGenerator.valueToCode(block, 'PIN', cppGenerator.ORDER_ATOMIC) || '0';
  const mode = block.getFieldValue('MODE'); // dropdown se lee igual
  return 'funcion(' + pin + ', ' + mode + ');\n';
};
```

### Toolbox (en blocks.js)

Dentro de la categoría correspondiente, agregar:
```javascript
{ 'kind': 'block', 'type': 'X_advanced', 'level': 3 }
```

---

## Orden de Implementación (por archivo, complejidad creciente)

### Fase 1: Bloques simples (1-2 campos)
1. no_tone_output_advanced — 1 campo PIN
2. serial_begin_advanced — 1 campo BAUD
3. stepper_speed_advanced — 1 campo RPM
4. stepper_step_advanced — 1 campo COUNT
5. servo_write_advanced — 1 campo ANGLE
6. servo_write_us_advanced — 1 campo US
7. tone_duration_advanced — 1 campo PIN + 2 input_value existentes

### Fase 2: Bloques con 2-3 campos
8. analog_write_advanced — 1 campo PIN (VALUE ya es input_value)
9. dht_create_advanced — 1 campo PIN + NAME + TYPE dropdown
10. servo_create_advanced — 1 campo PIN + NAME
11. ultrasonic_create_advanced — 2 campos TRIG + ECHO
12. pulse_in_advanced — 2 campos PIN + TIMEOUT + VALUE dropdown
13. attach_interrupt_advanced — 1 campo PIN + MODE dropdown + input_statement BODY

### Fase 3: Bloques con múltiples campos
14. lcd_set_cursor_advanced — 2 campos COL + ROW
15. lcd_i2c_create_advanced — 2 campos COLS + ROWS + ADDR dropdown
16. map_value_advanced — 4 campos range + 1 input_value existente
17. stepper_create_advanced — 5 campos STEPS + P1-P4
18. lcd_create_advanced — 8 campos RS, EN, D4-D7, COLS, ROWS

---

## Verificación

Después de cada bloque:
1. `cd /home/mortem/proyectos/ardublock/frontend && npx vite build 2>&1 | tail -5` — verificar que compila sin errores
2. Revisar que el bloque aparece en el toolbox con nivel 3 activado
3. Verificar que el generador produce código C++ válido con variable como parámetro

Después de cada archivo:
4. Commit con mensaje descriptivo en español

---

## No Implementar (fuera de alcance)

- Versiones _basic para bloques que solo tienen intermedia (el usuario pidió solo _advanced)
- Bloques estructurales (setup, loop)
- Bloques sin parámetros numéricos (millis, serial reads, etc.)
