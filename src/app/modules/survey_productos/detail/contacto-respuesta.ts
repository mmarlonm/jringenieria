export interface ContactoExtraido {
  nombre: string | null;
  empresa: string | null;
  email: string | null;
  telefono: string | null;
  cargo: string | null;
}

function normalizar(s: any): string {
  if (!s || typeof s !== 'string') return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function extraerContacto(campos: any, respuestas: any): ContactoExtraido {
  const resultado: ContactoExtraido = {
    nombre: null,
    empresa: null,
    email: null,
    telefono: null,
    cargo: null
  };

  if (!campos || !respuestas) {
    return resultado;
  }

  let listaCampos: any[] = [];
  if (Array.isArray(campos)) {
    listaCampos = campos;
  } else if (typeof campos === 'string') {
    try {
      const parsed = JSON.parse(campos);
      if (Array.isArray(parsed)) {
        listaCampos = parsed;
      } else if (parsed && Array.isArray(parsed.campos)) {
        listaCampos = parsed.campos;
      }
    } catch {
      return resultado;
    }
  } else if (campos && Array.isArray(campos.campos)) {
    listaCampos = campos.campos;
  }

  let mapaRespuestas: Record<string, any> = {};
  if (typeof respuestas === 'string') {
    try {
      mapaRespuestas = JSON.parse(respuestas);
    } catch {
      return resultado;
    }
  } else if (typeof respuestas === 'object') {
    mapaRespuestas = respuestas;
  }

  for (const campo of listaCampos) {
    if (!campo || typeof campo !== 'object') continue;

    const id = campo.id;
    if (!id) continue;

    const tipo = normalizar(campo.tipo || campo.type);
    if (tipo !== 'input' && tipo !== 'email' && tipo !== 'tel') {
      continue;
    }

    const rawValor = mapaRespuestas[id];
    if (rawValor === undefined || rawValor === null) {
      continue;
    }

    const valorStr = String(rawValor).trim();
    if (valorStr === '') {
      continue;
    }

    const etiqueta = normalizar(campo.etiqueta || campo.label);
    const idNorm = normalizar(id);

    let target: keyof ContactoExtraido | null = null;

    // (1) Por tipo
    if (tipo === 'email') {
      target = 'email';
    } else if (tipo === 'tel') {
      target = 'telefono';
    } else {
      // (2) Por etiqueta normalizada
      if (etiqueta.includes('empresa') || etiqueta.includes('organizacion') || etiqueta.includes('razon social')) {
        target = 'empresa';
      } else if (etiqueta.includes('cargo') || etiqueta.includes('puesto')) {
        target = 'cargo';
      } else if (etiqueta.includes('nombre')) {
        target = 'nombre';
      } else if (etiqueta.includes('telefono') || etiqueta.includes('celular') || etiqueta.includes('whatsapp')) {
        target = 'telefono';
      } else if (etiqueta.includes('correo') || etiqueta.includes('email')) {
        target = 'email';
      } else {
        // (3) Respaldo por id clásico
        if (idNorm === 'nombre' || idNorm === 'nombrecompleto' || idNorm === 'cliente') {
          target = 'nombre';
        } else if (idNorm === 'email' || idNorm === 'correo') {
          target = 'email';
        } else if (idNorm === 'telefono' || idNorm === 'celular') {
          target = 'telefono';
        } else if (idNorm === 'empresa' || idNorm === 'razonsocial') {
          target = 'empresa';
        } else if (idNorm === 'cargo' || idNorm === 'puesto') {
          target = 'cargo';
        }
      }
    }

    if (target && resultado[target] === null) {
      resultado[target] = valorStr;
    }
  }

  return resultado;
}

