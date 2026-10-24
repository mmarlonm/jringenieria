export interface EtapaConfig {
    numero: number;
    ruta: string;
    titulo: string;
    usaInformacion: boolean;
    usaFechaProgramada: boolean;
    usaMonto: boolean;
    permiteCrear: boolean;
    siguientes: number[];
}

export const ETAPAS: EtapaConfig[] = [
    {
        numero: 1,
        ruta: 'solicitud-cliente',
        titulo: 'Solicitud del cliente',
        usaInformacion: true,
        usaFechaProgramada: false,
        usaMonto: false,
        permiteCrear: true,
        siguientes: [2, 3, 4, 5]
    },
    {
        numero: 2,
        ruta: 'levantamiento-tecnico',
        titulo: 'Levantamiento técnico',
        usaInformacion: true,
        usaFechaProgramada: true,
        usaMonto: false,
        permiteCrear: false,
        siguientes: [3, 4, 5]
    },
    {
        numero: 3,
        ruta: 'diseno-calculo',
        titulo: 'Diseño/Cálculo e Ingeniería',
        usaInformacion: false,
        usaFechaProgramada: false,
        usaMonto: false,
        permiteCrear: false,
        siguientes: [4, 5]
    },
    {
        numero: 4,
        ruta: 'presupuesto-tecnico',
        titulo: 'Presupuesto técnico',
        usaInformacion: false,
        usaFechaProgramada: false,
        usaMonto: false,
        permiteCrear: false,
        siguientes: [5]
    },
    {
        numero: 5,
        ruta: 'propuesta-tecnico-comercial',
        titulo: 'Propuesta técnico-comercial',
        usaInformacion: false,
        usaFechaProgramada: false,
        usaMonto: true,
        permiteCrear: false,
        siguientes: []
    }
];

export function obtenerEtapaConfig(numero: number): EtapaConfig | undefined {
    return ETAPAS.find((e) => e.numero === numero);
}

export function obtenerEtapaConfigPorRuta(ruta: string): EtapaConfig | undefined {
    return ETAPAS.find((e) => e.ruta === ruta);
}
