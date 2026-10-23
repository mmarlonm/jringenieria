import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DateTime } from 'luxon';
import { forkJoin } from 'rxjs';
import { ColaboradoresService } from '../colaboradores.service';
import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import {
    Beneficiario, Catalogos, ColaboradorDetalle, ColaboradorGuardar, ColaboradorLista, Contrato, EstatusColaborador,
    PERMISO_AUSENCIAS, PERMISO_EXPEDIENTES, PERMISO_NOMINA, PERMISO_SALUD
} from '../colaboradores.types';
import { aFechaIso, desdeIso, mensajeError, textoONull } from '../colaboradores.utils';
import { ExpedienteComponent } from '../../expediente/expediente.component';
import { TabAusenciasComponent } from './tab-ausencias.component';
import { TabContratosComponent } from './tab-contratos.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TabHistorialComponent } from './tab-historial.component';
import { TabNominaComponent } from './tab-nomina.component';
import { TabSaludComponent } from './tab-salud.component';

const TEXTOS = [
    'codigo', 'puesto', 'rfc', 'curp', 'nss', 'codigoPostalFiscal', 'correoPersonal', 'correoEmpresa', 'direccionHogar',
    'contactoEmergenciaNombre', 'contactoEmergenciaTelefono', 'contactoEmergenciaParentesco',
    'tallaCamisa', 'tallaPantalon', 'tallaCalzado',
    'nivelAcademico', 'estatusAcademico', 'cedulaProfesional', 'idiomas', 'experienciaPrevia', 'observaciones'
] as const;
const FECHAS = ['fechaAltaImss', 'fechaBajaImss', 'fechaIngresoReal', 'fechaAntiguedadReconocida', 'finPeriodoPrueba'] as const;
const NUMEROS = ['sucursalId', 'departamentoId', 'jefeInmediatoId'] as const;

/** Ficha del colaborador: datos generales, beneficiarios, contratos, nómina y salud (estas dos con permiso especial) e historial. */
@Component({
    selector: 'rrhh-colaborador-ficha',
    standalone: true,
    templateUrl: './colaborador-ficha.component.html',
    imports: [
        CommonModule, ReactiveFormsModule, RouterLink,
        MatTabsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule,
        MatDatepickerModule, MatCheckboxModule,
        TabContratosComponent, TabNominaComponent, TabSaludComponent, TabHistorialComponent, ExpedienteComponent, TabAusenciasComponent
    ]
})
export class ColaboradorFichaComponent implements OnInit {
    private readonly _fb = inject(FormBuilder);
    private readonly _service = inject(ColaboradoresService);
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _snackBar = inject(MatSnackBar);
    private readonly _permisos = inject(PermisosEspecialesService);

    /** null = alta de un colaborador nuevo. */
    id: number | null = null;
    colaborador: ColaboradorDetalle | null = null;
    catalogos: Catalogos | null = null;
    jefes: ColaboradorLista[] = [];
    contratos: Contrato[] = [];
    guardando = false;
    /** Sube después de cada guardado; las pestañas que dependen del historial lo observan. */
    version = 0;

    readonly form = this._fb.group({
        codigo: [''],
        nombre: ['', Validators.required],
        // 0 = sin asignar (un valor null deja el select en blanco); se convierte a null al enviar al API
        sucursalId: [0],
        departamentoId: [0],
        puesto: [''],
        jefeInmediatoId: [0],
        fechaAltaImss: [null as DateTime | null],
        fechaBajaImss: [null as DateTime | null],
        fechaIngresoReal: [null as DateTime | null],
        fechaAntiguedadReconocida: [null as DateTime | null],
        finPeriodoPrueba: [null as DateTime | null],
        rfc: [''], curp: [''], nss: [''], codigoPostalFiscal: [''],
        consentimientoDatos: [false],
        constanciaVacacionesAnio: [null as number | null],
        correoPersonal: [''], correoEmpresa: [''],
        direccionHogar: [''],
        contactoEmergenciaNombre: [''], contactoEmergenciaTelefono: [''], contactoEmergenciaParentesco: [''],
        tallaCamisa: [''], tallaPantalon: [''], tallaCalzado: [''],
        nivelAcademico: [''], estatusAcademico: [''], cedulaProfesional: [''], idiomas: [''],
        experienciaPrevia: [''], observaciones: ['']
    });

    /** Campos de texto de la ficha agrupados por sección del Excel (hoja ET 1 COLABORADORES); `ancho` = ocupa toda la fila. */
    readonly gruposTexto: { titulo: string; campos: { nombre: (typeof TEXTOS)[number]; etiqueta: string; max: number; ancho?: boolean }[] }[] = [
        {
            titulo: 'Legal y fiscal',
            campos: [
                { nombre: 'rfc', etiqueta: 'RFC', max: 13 },
                { nombre: 'curp', etiqueta: 'CURP', max: 18 },
                { nombre: 'nss', etiqueta: 'NSS', max: 11 },
                { nombre: 'codigoPostalFiscal', etiqueta: 'Código postal fiscal', max: 5 }
            ]
        },
        {
            titulo: 'Contacto y emergencias',
            campos: [
                { nombre: 'correoPersonal', etiqueta: 'Correo personal', max: 200 },
                { nombre: 'correoEmpresa', etiqueta: 'Correo de la empresa', max: 200 },
                { nombre: 'direccionHogar', etiqueta: 'Dirección de hogar', max: 500, ancho: true },
                { nombre: 'contactoEmergenciaNombre', etiqueta: 'Contacto de emergencia', max: 200 },
                { nombre: 'contactoEmergenciaTelefono', etiqueta: 'Teléfono de emergencia', max: 30 },
                { nombre: 'contactoEmergenciaParentesco', etiqueta: 'Parentesco', max: 50 }
            ]
        },
        {
            titulo: 'Dotación (tallas)',
            campos: [
                { nombre: 'tallaCamisa', etiqueta: 'Talla de camisa', max: 10 },
                { nombre: 'tallaPantalon', etiqueta: 'Talla de pantalón', max: 10 },
                { nombre: 'tallaCalzado', etiqueta: 'Talla de calzado', max: 10 }
            ]
        },
        {
            titulo: 'Académico y perfil',
            campos: [
                { nombre: 'nivelAcademico', etiqueta: 'Nivel académico', max: 100 },
                { nombre: 'estatusAcademico', etiqueta: 'Estatus académico', max: 50 },
                { nombre: 'cedulaProfesional', etiqueta: 'Cédula profesional', max: 50 },
                { nombre: 'idiomas', etiqueta: 'Idiomas', max: 200 },
                { nombre: 'experienciaPrevia', etiqueta: 'Experiencia previa', max: 1000, ancho: true },
                { nombre: 'observaciones', etiqueta: 'Observaciones', max: 1000, ancho: true }
            ]
        }
    ];

    readonly beneficiarios = new FormArray<ReturnType<ColaboradorFichaComponent['nuevoBeneficiario']>>([]);

    get estatus(): EstatusColaborador {
        return this.colaborador?.estatus ?? 'INACTIVO';
    }

    /** Solo oculta las pestañas; el API es quien realmente niega (403) sin el permiso especial. */
    get puedeVerNomina(): boolean {
        return this._permisos.tiene(PERMISO_NOMINA);
    }

    get puedeVerSalud(): boolean {
        return this._permisos.tiene(PERMISO_SALUD);
    }

    get puedeVerExpediente(): boolean {
        return this._permisos.tiene(PERMISO_EXPEDIENTES);
    }

    get puedeVerAusencias(): boolean {
        return this._permisos.tiene(PERMISO_AUSENCIAS);
    }

    /** Lo que falta para activar, con los datos que hay hoy en el formulario (igual que la regla del API). */
    get faltantes(): string[] {
        const v = this.form.getRawValue();
        const faltan: string[] = [];
        if (!textoONull(v.rfc)) faltan.push('RFC');
        if (!textoONull(v.curp)) faltan.push('CURP');
        if (!textoONull(v.nss)) faltan.push('NSS');
        // El contrato firmado se exige solo al pasar a ACTIVO; quien ya lo es conserva la regla de siempre (al menos un contrato)
        if (this.estatus === 'ACTIVO') {
            if (this.contratos.length === 0) faltan.push('Contrato');
        } else if (!this.contratos.some((c) => c.tieneArchivoFirmado)) {
            faltan.push('Contrato firmado');
        }
        return faltan;
    }

    get totalBeneficiarios(): number {
        return Math.round(this.beneficiarios.controls.reduce((s, g) => s + (Number(g.value.porcentaje) || 0), 0) * 100) / 100;
    }

    /** Lista vacía es válida (sin beneficiarios); con filas, cada una completa y el total exacto en 100. */
    get beneficiariosValidos(): boolean {
        return this.beneficiarios.length === 0 || (this.beneficiarios.valid && this.totalBeneficiarios === 100);
    }

    ngOnInit(): void {
        const id = this._route.snapshot.paramMap.get('id');
        this.id = id ? Number(id) : null;

        forkJoin({ catalogos: this._service.catalogos(), jefes: this._service.listar({}) }).subscribe({
            next: ({ catalogos, jefes }) => {
                this.catalogos = catalogos;
                this.jefes = jefes.filter((j) => j.colaboradorId !== this.id);
            },
            error: (e) => this.avisar(mensajeError(e, 'No se pudieron cargar los catálogos.'))
        });

        if (this.id) {
            forkJoin({ detalle: this._service.obtener(this.id), contratos: this._service.listarContratos(this.id) }).subscribe({
                next: ({ detalle, contratos }) => {
                    this.contratos = contratos;
                    this.aplicar(detalle, true);
                },
                error: (e) => this.avisar(mensajeError(e, 'No se pudo cargar el colaborador.'))
            });
        }
    }

    guardar(estatus: EstatusColaborador = this.estatus): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.avisar('Revisa los datos marcados.');
            return;
        }
        this.guardando = true;
        const dto = this.armarDto(estatus);
        const peticion = this.id ? this._service.actualizar(this.id, dto) : this._service.crear(dto);
        peticion.subscribe({
            next: (detalle) => {
                this.guardando = false;
                this.avisar('Colaborador guardado.');
                if (this.id) {
                    this.aplicar(detalle, false);
                    this.version++;
                } else {
                    this._router.navigate(['/rrhh/colaboradores', detalle.colaboradorId]);
                }
            },
            error: (e) => {
                this.guardando = false;
                this.avisar(mensajeError(e, 'No se pudo guardar el colaborador.'));
            }
        });
    }

    /** Tras agregar o editar un contrato: refresca la lista, el estatus de contrato y el historial (sin tocar lo que se esté editando en el formulario). */
    recargarContratos(): void {
        if (!this.id) return;
        forkJoin({ detalle: this._service.obtener(this.id), contratos: this._service.listarContratos(this.id) }).subscribe({
            next: ({ detalle, contratos }) => {
                this.contratos = contratos;
                if (this.colaborador) {
                    this.colaborador = {
                        ...this.colaborador,
                        estatusContrato: detalle.estatusContrato,
                        fechaVencimientoContrato: detalle.fechaVencimientoContrato
                    };
                }
                this.version++;
            },
            error: (e) => this.avisar(mensajeError(e, 'No se pudo actualizar la lista de contratos.'))
        });
    }

    activar(): void {
        this.guardar('ACTIVO');
    }

    marcarInactivo(): void {
        if (confirm('¿Marcar a este colaborador como INACTIVO? La baja formal (finiquito, IMSS) se gestiona aparte.')) {
            this.guardar('INACTIVO');
        }
    }

    nuevoBeneficiario(b?: Beneficiario) {
        return this._fb.group({
            nombre: [b?.nombre ?? '', Validators.required],
            curp: [b?.curp ?? ''],
            porcentaje: [b?.porcentaje ?? 0, [Validators.required, Validators.min(0.01)]],
            parentesco: [b?.parentesco ?? '']
        });
    }

    agregarBeneficiario(): void {
        this.beneficiarios.push(this.nuevoBeneficiario());
    }

    quitarBeneficiario(indice: number): void {
        this.beneficiarios.removeAt(indice);
    }

    guardarBeneficiarios(): void {
        if (!this.id) return;
        if (!this.beneficiariosValidos) {
            this.beneficiarios.markAllAsTouched();
            this.avisar('Completa a los beneficiarios; los porcentajes deben sumar 100.');
            return;
        }
        const items: Beneficiario[] = this.beneficiarios.controls.map((g) => ({
            nombre: (g.value.nombre ?? '').trim(),
            curp: textoONull(g.value.curp)?.toUpperCase() ?? null,
            porcentaje: Number(g.value.porcentaje),
            parentesco: textoONull(g.value.parentesco)
        }));
        this._service.guardarBeneficiarios(this.id, items).subscribe({
            next: () => {
                this.avisar('Beneficiarios guardados.');
                this.version++;
            },
            error: (e) => this.avisar(mensajeError(e, 'No se pudieron guardar los beneficiarios.'))
        });
    }

    /** `conBeneficiarios` = false conserva las filas que el usuario esté capturando (se recargan solo al abrir la ficha). */
    private aplicar(d: ColaboradorDetalle, conBeneficiarios: boolean): void {
        this.colaborador = d;
        for (const campo of TEXTOS) this.form.controls[campo].setValue(d[campo] ?? '');
        for (const campo of FECHAS) this.form.controls[campo].setValue(desdeIso(d[campo]));
        for (const campo of NUMEROS) this.form.controls[campo].setValue(d[campo] ?? 0);
        this.form.controls.consentimientoDatos.setValue(d.consentimientoDatos ?? false);
        this.form.controls.constanciaVacacionesAnio.setValue(d.constanciaVacacionesAnio ?? null);
        this.form.controls.nombre.setValue(d.nombre);
        this.form.markAsPristine();

        if (conBeneficiarios) {
            this.beneficiarios.clear();
            d.beneficiarios.forEach((b) => this.beneficiarios.push(this.nuevoBeneficiario(b)));
        }
    }

    private armarDto(estatus: EstatusColaborador): ColaboradorGuardar {
        const v = this.form.getRawValue();
        return {
            codigo: textoONull(v.codigo),
            nombre: (v.nombre ?? '').trim(),
            // sin pantalla para vincular usuario: se conserva el vínculo que ya tenga (null borraría el enlace)
            usuarioId: this.colaborador?.usuarioId ?? null,
            sucursalId: v.sucursalId || null,
            departamentoId: v.departamentoId || null,
            puesto: textoONull(v.puesto),
            jefeInmediatoId: v.jefeInmediatoId || null,
            estatus,
            fechaAltaImss: aFechaIso(v.fechaAltaImss),
            fechaBajaImss: aFechaIso(v.fechaBajaImss),
            fechaIngresoReal: aFechaIso(v.fechaIngresoReal),
            fechaAntiguedadReconocida: aFechaIso(v.fechaAntiguedadReconocida),
            finPeriodoPrueba: aFechaIso(v.finPeriodoPrueba),
            consentimientoDatos: !!v.consentimientoDatos,
            constanciaVacacionesAnio: v.constanciaVacacionesAnio ?? null,
            codigoPostalFiscal: textoONull(v.codigoPostalFiscal),
            rfc: textoONull(v.rfc)?.toUpperCase() ?? null,
            curp: textoONull(v.curp)?.toUpperCase() ?? null,
            nss: textoONull(v.nss),
            correoPersonal: textoONull(v.correoPersonal),
            correoEmpresa: textoONull(v.correoEmpresa),
            direccionHogar: textoONull(v.direccionHogar),
            contactoEmergenciaNombre: textoONull(v.contactoEmergenciaNombre),
            contactoEmergenciaTelefono: textoONull(v.contactoEmergenciaTelefono),
            contactoEmergenciaParentesco: textoONull(v.contactoEmergenciaParentesco),
            tallaCamisa: textoONull(v.tallaCamisa),
            tallaPantalon: textoONull(v.tallaPantalon),
            tallaCalzado: textoONull(v.tallaCalzado),
            nivelAcademico: textoONull(v.nivelAcademico),
            estatusAcademico: textoONull(v.estatusAcademico),
            cedulaProfesional: textoONull(v.cedulaProfesional),
            idiomas: textoONull(v.idiomas),
            experienciaPrevia: textoONull(v.experienciaPrevia),
            observaciones: textoONull(v.observaciones)
        };
    }

    private avisar(texto: string): void {
        this._snackBar.open(texto, 'Cerrar', { duration: 5000 });
    }
}
