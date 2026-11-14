import { agruparExistencias } from './existencias.utils';

describe('existencias.utils', () => {
    it('agruparExistencias_agrupa_por_codigo_y_suma_almacenes', () => {
        const input = [
            { codigo: 'CAB-01', producto: 'Cable THW 12', almacen: 'QRO', cantidadReal: 20, unidadMedida: 'METRO' },
            { codigo: 'CAB-01', producto: 'Cable THW 12', almacen: 'CDMX', cantidadReal: 30, unidadMedida: 'METRO' },
            { codigo: 'SEN-02', producto: 'Sensor', almacen: 'QRO', cantidadReal: 5, unidadMedida: 'PZA' }
        ];

        const res = agruparExistencias(input);
        expect(res.length).toBe(2);

        const cab = res.find(p => p.codigoProducto === 'CAB-01');
        expect(cab).toBeDefined();
        expect(cab!.existencia).toBe(50);
        expect(cab!.nombreProducto).toBe('Cable THW 12');
        expect(cab!.unidadMedida).toBe('METRO');
        expect(cab!.existenciasDesglosadas).toEqual([
            { almacen: 'QRO', cantidad: 20 },
            { almacen: 'CDMX', cantidad: 30 }
        ]);

        const sen = res.find(p => p.codigoProducto === 'SEN-02');
        expect(sen).toBeDefined();
        expect(sen!.existencia).toBe(5);
        expect(sen!.existenciasDesglosadas).toEqual([
            { almacen: 'QRO', cantidad: 5 }
        ]);
    });

    it('agruparExistencias_acepta_respuesta_con_data_o_arreglo', () => {
        const item = { codigoProducto: 'X1', nombreProducto: 'Prod X', existencia: 10, almacen: 'A1' };
        const resArreglo = agruparExistencias([item]);
        expect(resArreglo.length).toBe(1);
        expect(resArreglo[0].codigoProducto).toBe('X1');
        expect(resArreglo[0].existencia).toBe(10);

        const resEnvoltorio = agruparExistencias({ data: [item] });
        expect(resEnvoltorio.length).toBe(1);
        expect(resEnvoltorio[0].codigoProducto).toBe('X1');
        expect(resEnvoltorio[0].existencia).toBe(10);
    });

    it('agruparExistencias_con_algo_que_no_es_arreglo_devuelve_vacio', () => {
        expect(agruparExistencias(null)).toEqual([]);
        expect(agruparExistencias(undefined)).toEqual([]);
        expect(agruparExistencias('invalido')).toEqual([]);
        expect(agruparExistencias({ data: 'invalido' })).toEqual([]);
        expect(agruparExistencias({})).toEqual([]);
    });
});

