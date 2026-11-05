import { extraerContacto } from './contacto-respuesta';

describe('ContactoRespuesta — extraerContacto', () => {
  it('Caso 1: forma real del formulario 2 (sección nombre + input campo_mw2y0stm Nombre completo)', () => {
    const campos = [
      { id: 'nombre', tipo: 'section', etiqueta: 'Datos de contacto' },
      { id: 'campo_mw2y0stm', tipo: 'input', etiqueta: 'Nombre completo' }
    ];
    const respuestas = { campo_mw2y0stm: 'Ana Pérez' };
    const res = extraerContacto(campos, respuestas);
    expect(res.nombre).toBe('Ana Pérez');
    expect(res.empresa).toBeNull();
    expect(res.email).toBeNull();
    expect(res.telefono).toBeNull();
    expect(res.cargo).toBeNull();
  });

  it('Caso 2: input con id nombre y etiqueta Nombre del evaluador', () => {
    const campos = [{ id: 'nombre', tipo: 'input', etiqueta: 'Nombre del evaluador' }];
    const respuestas = { nombre: 'Luis' };
    const res = extraerContacto(campos, respuestas);
    expect(res.nombre).toBe('Luis');
  });

  it('Caso 3: etiqueta Tu nombre completo con id arbitrario', () => {
    const campos = [{ id: 'campo_x', tipo: 'input', etiqueta: 'Tu nombre completo' }];
    const respuestas = { campo_x: 'Marta' };
    const res = extraerContacto(campos, respuestas);
    expect(res.nombre).toBe('Marta');
  });

  it('Caso 4: etiquetas Empresa u Organización, Razón social, Nombre de la empresa clasifican como empresa', () => {
    const etiquetas = ['Empresa u Organización', 'Razón social', 'Nombre de la empresa'];
    for (const etq of etiquetas) {
      const campos = [{ id: 'c_emp', tipo: 'input', etiqueta: etq }];
      const respuestas = { c_emp: 'Industrias JR' };
      const res = extraerContacto(campos, respuestas);
      expect(res.empresa).toBe('Industrias JR');
      expect(res.nombre).toBeNull();
    }
  });

  it('Caso 5: etiqueta Puesto o Cargo clasifica como cargo', () => {
    const campos = [{ id: 'c_cargo', tipo: 'input', etiqueta: 'Puesto o Cargo' }];
    const respuestas = { c_cargo: 'Jefe de Mantenimiento' };
    const res = extraerContacto(campos, respuestas);
    expect(res.cargo).toBe('Jefe de Mantenimiento');
  });

  it('Caso 6: tipo email con etiqueta rara y tipo tel con etiqueta rara clasifican por tipo', () => {
    const campos = [
      { id: 'c_mail', tipo: 'email', etiqueta: 'Contacto' },
      { id: 'c_tel', tipo: 'tel', etiqueta: 'Dato' }
    ];
    const respuestas = { c_mail: 'contacto@empresa.com', c_tel: '5512345678' };
    const res = extraerContacto(campos, respuestas);
    expect(res.email).toBe('contacto@empresa.com');
    expect(res.telefono).toBe('5512345678');
  });

  it('Caso 7: section con id nombre se ignora y da nombre null', () => {
    const campos = [{ id: 'nombre', tipo: 'section', etiqueta: 'Datos personales' }];
    const respuestas = { nombre: 'x' };
    const res = extraerContacto(campos, respuestas);
    expect(res.nombre).toBeNull();
  });

  it('Caso 8: etiqueta genérica con id clásico usa respaldo por id', () => {
    const campos = [{ id: 'nombre', tipo: 'input', etiqueta: 'Dato 1' }];
    const respuestas = { nombre: 'Rosa' };
    const res = extraerContacto(campos, respuestas);
    expect(res.nombre).toBe('Rosa');
  });

  it('Caso 9: valores solo con espacios dan todo null', () => {
    const campos = [
      { id: 'c1', tipo: 'input', etiqueta: 'Nombre' },
      { id: 'c2', tipo: 'email', etiqueta: 'Correo' }
    ];
    const respuestas = { c1: '   ', c2: ' \t\n ' };
    const res = extraerContacto(campos, respuestas);
    expect(res.nombre).toBeNull();
    expect(res.empresa).toBeNull();
    expect(res.email).toBeNull();
    expect(res.telefono).toBeNull();
    expect(res.cargo).toBeNull();
  });

  it('Caso 10: camposConfigJson o respuestas inválidos dan todo null sin lanzar excepción', () => {
    expect(extraerContacto(null, null)).toEqual({
      nombre: null,
      empresa: null,
      email: null,
      telefono: null,
      cargo: null
    });
    expect(extraerContacto('invalido json', '{')).toEqual({
      nombre: null,
      empresa: null,
      email: null,
      telefono: null,
      cargo: null
    });
    expect(extraerContacto([], {})).toEqual({
      nombre: null,
      empresa: null,
      email: null,
      telefono: null,
      cargo: null
    });
  });
});

