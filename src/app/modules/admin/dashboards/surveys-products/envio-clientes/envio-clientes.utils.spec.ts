import { DestinatarioClienteDto } from './envio-clientes.types';
import {
    alternarTodos,
    analizarCorreosLibres,
    contarPorEstado,
    esSeleccionable,
    filtrar,
    ordenar,
    prepararEnvio,
    resumen,
} from './envio-clientes.utils';

describe('EnvioClientesUtils', () => {
    const mockClientes: DestinatarioClienteDto[] = [
        {
            clienteId: 1,
            nombre: 'José García',
            empresa: 'Constructora Alfa',
            correo: 'jose@alfa.com',
            estadoCorreo: 'valido',
            correoRepetido: false,
            activo: true,
        },
        {
            clienteId: 2,
            nombre: 'Ana Martínez',
            empresa: 'Comercializadora Beta',
            correo: null,
            estadoCorreo: 'sinCorreo',
            correoRepetido: false,
            activo: true,
        },
        {
            clienteId: 3,
            nombre: 'Carlos López',
            empresa: 'Delta SA',
            correo: 'carlos-invalido',
            estadoCorreo: 'invalido',
            correoRepetido: false,
            activo: true,
        },
        {
            clienteId: 4,
            nombre: 'María Fernández',
            empresa: 'Gama Inc',
            correo: 'maria@gama.com',
            estadoCorreo: 'valido',
            correoRepetido: false,
            activo: false,
        },
        {
            clienteId: 5,
            nombre: 'Roberto Gómez',
            empresa: null,
            correo: 'jose@alfa.com', // repetido con José García
            estadoCorreo: 'valido',
            correoRepetido: true,
            activo: true,
        },
    ];

    describe('esSeleccionable', () => {
        it('solo devuelve true si estadoCorreo es valido', () => {
            expect(esSeleccionable(mockClientes[0])).toBeTrue();
            expect(esSeleccionable(mockClientes[1])).toBeFalse();
            expect(esSeleccionable(mockClientes[2])).toBeFalse();
        });
    });

    describe('filtrar', () => {
        it('filtra por estado activos e inactivos', () => {
            const activos = filtrar(mockClientes, { estado: 'activos' });
            expect(activos.length).toBe(4);
            expect(activos.every((c) => c.activo)).toBeTrue();

            const inactivos = filtrar(mockClientes, { estado: 'inactivos' });
            expect(inactivos.length).toBe(1);
            expect(inactivos[0].clienteId).toBe(4);
        });

        it('filtra con soloConCorreo', () => {
            const soloValidos = filtrar(mockClientes, { estado: 'activos', soloConCorreo: true });
            expect(soloValidos.length).toBe(2);
            expect(soloValidos.map((c) => c.clienteId)).toEqual([1, 5]);
        });

        it('filtra por texto ignorando mayusculas y acentos (jose encuentra Jose)', () => {
            const resultado = filtrar(mockClientes, { estado: 'activos', texto: 'jose' });
            expect(resultado.some((c) => c.nombre === 'José García')).toBeTrue();
        });

        it('filtra por texto en empresa o correo', () => {
            const porEmpresa = filtrar(mockClientes, { estado: 'activos', texto: 'Constructora' });
            expect(porEmpresa.length).toBe(1);
            expect(porEmpresa[0].clienteId).toBe(1);

            const porCorreo = filtrar(mockClientes, { estado: 'activos', texto: 'carlos-invalido' });
            expect(porCorreo.length).toBe(1);
            expect(porCorreo[0].clienteId).toBe(3);
        });
    });

    describe('ordenar', () => {
        it('ordena primero por valido y luego por nombre', () => {
            const ordenados = ordenar(mockClientes);
            expect(ordenados[0].estadoCorreo).toBe('valido');
            expect(ordenados[1].estadoCorreo).toBe('valido');
            expect(ordenados[2].estadoCorreo).toBe('valido');

            // Entre los validos: José García, María Fernández, Roberto Gómez
            const nombresValidos = ordenados.slice(0, 3).map((c) => c.nombre);
            expect(nombresValidos).toEqual(['José García', 'María Fernández', 'Roberto Gómez']);

            // Los no válidos después, ordenados por nombre: Ana Martínez, Carlos López
            const nombresNoValidos = ordenados.slice(3).map((c) => c.nombre);
            expect(nombresNoValidos).toEqual(['Ana Martínez', 'Carlos López']);
        });

        it('no muta el arreglo original', () => {
            const copia = [...mockClientes];
            ordenar(mockClientes);
            expect(mockClientes).toEqual(copia);
        });
    });

    describe('alternarTodos', () => {
        it('no marca sin correo ni deshabilitados', () => {
            const visibles = mockClientes.filter((c) => c.activo);
            const seleccionInicial = new Set<number>();
            const nuevaSeleccion = alternarTodos(visibles, seleccionInicial);

            expect(nuevaSeleccion.has(1)).toBeTrue();
            expect(nuevaSeleccion.has(5)).toBeTrue();
            expect(nuevaSeleccion.has(2)).toBeFalse(); // sinCorreo
            expect(nuevaSeleccion.has(3)).toBeFalse(); // invalido
        });

        it('desmarca todos si todos los visibles seleccionables ya estaban marcados', () => {
            const visibles = mockClientes.filter((c) => c.activo);
            const seleccionInicial = new Set<number>([1, 5]);
            const nuevaSeleccion = alternarTodos(visibles, seleccionInicial);

            expect(nuevaSeleccion.has(1)).toBeFalse();
            expect(nuevaSeleccion.has(5)).toBeFalse();
        });

        it('conserva selecciones de elementos no visibles', () => {
            const visibles = [mockClientes[0]]; // solo cliente 1
            const seleccionInicial = new Set<number>([4]); // cliente 4 estaba seleccionado y no es visible
            const nuevaSeleccion = alternarTodos(visibles, seleccionInicial);

            expect(nuevaSeleccion.has(4)).toBeTrue(); // conservado
            expect(nuevaSeleccion.has(1)).toBeTrue(); // agregado
        });
    });

    describe('contarPorEstado', () => {
        it('cuenta activos e inactivos', () => {
            const conteo = contarPorEstado(mockClientes);
            expect(conteo).toEqual({ activos: 4, inactivos: 1 });
        });
    });

    describe('analizarCorreosLibres', () => {
        it('separa por comas, punto y coma, espacios y saltos de linea', () => {
            const r1 = analizarCorreosLibres('a@b.com, c@d.com');
            expect(r1.validos).toEqual(['a@b.com', 'c@d.com']);
            expect(r1.invalidos).toEqual([]);
            expect(r1.repetidos).toBe(0);

            const r2 = analizarCorreosLibres('a@b.com;c@d.com\nE@F.com');
            expect(r2.validos).toEqual(['a@b.com', 'c@d.com', 'e@f.com']);
            expect(r2.invalidos).toEqual([]);
            expect(r2.repetidos).toBe(0);
        });

        it('detecta correos repetidos sin importar mayusculas', () => {
            const r = analizarCorreosLibres('A@B.com a@b.com');
            expect(r.validos).toEqual(['a@b.com']);
            expect(r.invalidos).toEqual([]);
            expect(r.repetidos).toBe(1);
        });

        it('detecta correos invalidos segun las reglas', () => {
            expect(analizarCorreosLibres('sin-arroba').invalidos).toEqual(['sin-arroba']);
            expect(analizarCorreosLibres('a@b').invalidos).toEqual(['a@b']);
            expect(analizarCorreosLibres('a@b.').invalidos).toEqual(['a@b.']);
            expect(analizarCorreosLibres('@b.com').invalidos).toEqual(['@b.com']);
        });

        it('maneja texto vacio', () => {
            const r = analizarCorreosLibres('   ');
            expect(r.validos).toEqual([]);
            expect(r.invalidos).toEqual([]);
            expect(r.repetidos).toBe(0);
        });
    });

    describe('prepararEnvio', () => {
        it('dos clientes con el mismo correo en posiciones que caerían en lotes distintos reciben un solo envio y el otro queda en omitidosLocales', () => {
            // Creamos 11 clientes válidos donde el 1 y el 11 tienen el mismo correo
            const clientes: DestinatarioClienteDto[] = [
                { clienteId: 1, nombre: 'C1', empresa: null, correo: 'repetido@test.com', estadoCorreo: 'valido', correoRepetido: true, activo: true },
            ];
            for (let i = 2; i <= 10; i++) {
                clientes.push({
                    clienteId: i,
                    nombre: `C${i}`,
                    empresa: null,
                    correo: `cliente${i}@test.com`,
                    estadoCorreo: 'valido',
                    correoRepetido: false,
                    activo: true,
                });
            }
            clientes.push({
                clienteId: 11,
                nombre: 'C11',
                empresa: null,
                correo: 'repetido@test.com',
                estadoCorreo: 'valido',
                correoRepetido: true,
                activo: true,
            });

            const seleccion = new Set<number>(clientes.map((c) => c.clienteId));
            const prep = prepararEnvio(clientes, seleccion, []);

            expect(prep.destinatarios).toBe(10);
            expect(prep.lotes.length).toBe(1);
            expect(prep.lotes[0].clienteIds.length).toBe(10);
            expect(prep.lotes[0].clienteIds).not.toContain(11);
            expect(prep.omitidosLocales).toEqual([
                {
                    clienteId: 11,
                    nombre: 'C11',
                    motivo: 'Correo repetido: ya se envió a otro destinatario de la selección',
                },
            ]);
        });

        it('un correo libre igual al de un cliente queda omitido en omitidosLocales', () => {
            const clientes: DestinatarioClienteDto[] = [
                { clienteId: 1, nombre: 'Cliente 1', empresa: null, correo: 'compartido@test.com', estadoCorreo: 'valido', correoRepetido: false, activo: true },
            ];
            const seleccion = new Set<number>([1]);
            const libres = ['compartido@test.com'];

            const prep = prepararEnvio(clientes, seleccion, libres);
            expect(prep.destinatarios).toBe(1);
            expect(prep.lotes[0].clienteIds).toEqual([1]);
            expect(prep.lotes[0].correosLibres).toEqual([]);
            expect(prep.omitidosLocales).toEqual([
                {
                    clienteId: null,
                    nombre: 'compartido@test.com',
                    motivo: 'Correo repetido: ya se envió a otro destinatario de la selección',
                },
            ]);
        });

        it('25 destinatarios generan 3 lotes de 10, 10 y 5', () => {
            const clientes: DestinatarioClienteDto[] = [];
            for (let i = 1; i <= 25; i++) {
                clientes.push({
                    clienteId: i,
                    nombre: `Cliente ${i}`,
                    empresa: null,
                    correo: `c${i}@test.com`,
                    estadoCorreo: 'valido',
                    correoRepetido: false,
                    activo: true,
                });
            }
            const seleccion = new Set<number>(clientes.map((c) => c.clienteId));
            const prep = prepararEnvio(clientes, seleccion, []);

            expect(prep.destinatarios).toBe(25);
            expect(prep.lotes.length).toBe(3);
            expect(prep.lotes[0].clienteIds.length).toBe(10);
            expect(prep.lotes[1].clienteIds.length).toBe(10);
            expect(prep.lotes[2].clienteIds.length).toBe(5);
        });

        it('funciona solo con correos libres', () => {
            const libres = ['a@test.com', 'b@test.com'];
            const prep = prepararEnvio([], new Set(), libres);

            expect(prep.destinatarios).toBe(2);
            expect(prep.lotes.length).toBe(1);
            expect(prep.lotes[0].clienteIds).toEqual([]);
            expect(prep.lotes[0].correosLibres).toEqual(['a@test.com', 'b@test.com']);
            expect(prep.omitidosLocales).toEqual([]);
        });

        it('funciona solo con clientes', () => {
            const clientes: DestinatarioClienteDto[] = [
                { clienteId: 1, nombre: 'C1', empresa: null, correo: 'c1@test.com', estadoCorreo: 'valido', correoRepetido: false, activo: true },
            ];
            const prep = prepararEnvio(clientes, new Set([1]), []);

            expect(prep.destinatarios).toBe(1);
            expect(prep.lotes.length).toBe(1);
            expect(prep.lotes[0].clienteIds).toEqual([1]);
            expect(prep.lotes[0].correosLibres).toEqual([]);
        });
    });

    describe('resumen', () => {
        it('cuenta dos clientes con el mismo correo como un solo destinatario unico', () => {
            const seleccion = new Set<number>([1, 5]); // José García y Roberto Gómez comparten jose@alfa.com
            const res = resumen(mockClientes, seleccion, []);

            expect(res.clientes).toBe(2);
            expect(res.correosLibres).toBe(0);
            expect(res.destinatariosUnicos).toBe(1);
        });

        it('incluye correos libres y calcula destinatarios unicos totales', () => {
            const seleccion = new Set<number>([1]); // 1 cliente: jose@alfa.com
            const libres = ['nuevo@test.com', 'jose@alfa.com']; // uno nuevo, uno repetido con el cliente

            const res = resumen(mockClientes, seleccion, libres);
            expect(res.clientes).toBe(1);
            expect(res.correosLibres).toBe(2);
            expect(res.destinatariosUnicos).toBe(2); // jose@alfa.com y nuevo@test.com
        });
    });
});

