import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { DateTime } from 'luxon';
import { ColaboradoresService } from '../colaboradores.service';
import { Catalogos, Contrato, ContratoGuardar, EstatusContrato, TipoContrato } from '../colaboradores.types';
import { aFechaIso, desdeIso, mensajeError, textoONull } from '../colaboradores.utils';

/** Historial de contratos: alta y edición según las reglas del tipo (vencimiento, proyecto, duración máxima). */
@Component({
    selector: 'rrhh-tab-contratos',
    standalone: true,
    templateUrl: './tab-contratos.component.html',
    imports: [
        CommonModule, ReactiveFormsModule,
        MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule,
        MatDatepickerModule
    ]
})
export class TabContratosComponent {
    private readonly _fb = inject(FormBuilder);
    private readonly _service = inject(ColaboradoresService);
    private readonly _snackBar = inject(MatSnackBar);

    @Input({ required: true }) colaboradorId!: number;
    @Input() catalogos: Catalogos | null = null;
    @Input() contratos: Contrato[] = [];
    /** La ficha vuelve a cargar contratos y estatus cuando esto se emite. */
    @Output() cambio = new EventEmitter<void>();

    readonly columnas = ['tipo', 'emision', 'vencimiento', 'proyecto', 'estatus', 'firmado', 'notas', 'acciones'];
    @ViewChild('firmado', { static: true }) selectorFirmado!: ElementRef<HTMLInputElement>;
    private _contratoFirmado: Contrato | null = null;
    subiendoFirmado: number | null = null;
    formAbierto = false;
    editando: Contrato | null = null;
    guardando = false;

    readonly form = this._fb.group({
        tipoContratoId: [null as number | null, Validators.required],
        fechaEmision: [null as DateTime | null, Validators.required],
        duracionDias: [null as number | null],
        fechaVencimiento: [null as DateTime | null],
        proyectoId: [null as number | null],
        notas: ['']
    });

    constructor() {
        // «Duración (días)» es un atajo: calcula el vencimiento a partir de la emisión
        this.form.controls.duracionDias.valueChanges.subscribe(() => this.calcularVencimiento());
        this.form.controls.fechaEmision.valueChanges.subscribe(() => this.calcularVencimiento());
        // al cambiar de tipo se limpian los campos que ese tipo no usa
        this.form.controls.tipoContratoId.valueChanges.subscribe(() => {
            if (!this.tipo?.permiteFechaFin) {
                this.form.patchValue({ fechaVencimiento: null, duracionDias: null }, { emitEvent: false });
            }
            if (!this.tipo?.requiereProyecto) this.form.patchValue({ proyectoId: null }, { emitEvent: false });
        });
    }

    get tipo(): TipoContrato | undefined {
        return this.catalogos?.tiposContrato.find((t) => t.id === this.form.controls.tipoContratoId.value);
    }

    /** Días entre emisión y vencimiento (null si falta alguna fecha). */
    get diasDelContrato(): number | null {
        const { fechaEmision, fechaVencimiento } = this.form.getRawValue();
        if (!fechaEmision || !fechaVencimiento) return null;
        return Math.round(fechaVencimiento.startOf('day').diff(fechaEmision.startOf('day'), 'days').days);
    }

    get excedeDuracionMaxima(): boolean {
        const max = this.tipo?.duracionMaximaDias;
        return !!max && (this.diasDelContrato ?? 0) > max;
    }

    nuevo(): void {
        this.editando = null;
        this.form.reset({ tipoContratoId: null, fechaEmision: null, duracionDias: null, fechaVencimiento: null, proyectoId: null, notas: '' });
        this.formAbierto = true;
    }

    editar(c: Contrato): void {
        this.editando = c;
        this.form.reset({
            tipoContratoId: c.tipoContratoId, fechaEmision: desdeIso(c.fechaEmision), duracionDias: null,
            fechaVencimiento: desdeIso(c.fechaVencimiento), proyectoId: c.proyectoId, notas: c.notas ?? ''
        }, { emitEvent: false });
        this.formAbierto = true;
    }

    cancelar(): void {
        this.formAbierto = false;
        this.editando = null;
    }

    guardar(): void {
        const v = this.form.getRawValue();
        const tipo = this.tipo;
        if (this.form.invalid || !tipo || !v.fechaEmision) {
            this.form.markAllAsTouched();
            this.avisar('Elige el tipo de contrato y la fecha de emisión.');
            return;
        }
        if (tipo.requiereFechaFin && !v.fechaVencimiento) {
            this.avisar(`El contrato «${tipo.nombre}» requiere fecha de vencimiento.`);
            return;
        }
        if (tipo.requiereProyecto && !v.proyectoId) {
            this.avisar(`El contrato «${tipo.nombre}» requiere un proyecto asociado.`);
            return;
        }

        const dto: ContratoGuardar = {
            tipoContratoId: tipo.id,
            fechaEmision: aFechaIso(v.fechaEmision)!,
            fechaVencimiento: tipo.permiteFechaFin ? aFechaIso(v.fechaVencimiento) : null,
            proyectoId: tipo.requiereProyecto ? v.proyectoId : null,
            notas: textoONull(v.notas)
        };
        this.guardando = true;
        const peticion = this.editando
            ? this._service.actualizarContrato(this.colaboradorId, this.editando.contratoId, dto)
            : this._service.agregarContrato(this.colaboradorId, dto);
        peticion.subscribe({
            next: () => {
                this.guardando = false;
                this.avisar('Contrato guardado.');
                this.cancelar();
                this.cambio.emit();
            },
            error: (e) => {
                this.guardando = false;
                this.avisar(mensajeError(e, 'No se pudo guardar el contrato.'));
            }
        });
    }

    claseEstatus(estatus: EstatusContrato): string {
        switch (estatus) {
            case 'VIGENTE': return 'bg-green-100 text-green-800';
            case 'POR VENCER': return 'bg-amber-100 text-amber-800';
            case 'VENCIDO': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    private calcularVencimiento(): void {
        const { fechaEmision, duracionDias } = this.form.getRawValue();
        if (!fechaEmision || !duracionDias || duracionDias < 1) return;
        this.form.controls.fechaVencimiento.setValue(fechaEmision.plus({ days: duracionDias }), { emitEvent: false });
    }

    private avisar(texto: string): void {
        this._snackBar.open(texto, 'Cerrar', { duration: 5000 });
    }

    // ------------------------------------------------------------------ contrato firmado

    pedirFirmado(c: Contrato): void {
        this._contratoFirmado = c;
        this.selectorFirmado.nativeElement.value = '';
        this.selectorFirmado.nativeElement.click();
    }

    alElegirFirmado(evento: Event): void {
        const archivo = (evento.target as HTMLInputElement).files?.[0];
        const contrato = this._contratoFirmado;
        if (!archivo || !contrato) return;
        if (archivo.size > 10 * 1024 * 1024) {
            this._snackBar.open('El archivo pesa más de 10 MB.', 'Cerrar', { duration: 5000 });
            return;
        }
        this.subiendoFirmado = contrato.contratoId;
        this._service.subirContratoFirmado(this.colaboradorId, contrato.contratoId, archivo).subscribe({
            next: () => {
                this.subiendoFirmado = null;
                this._snackBar.open('Contrato firmado guardado.', 'Cerrar', { duration: 5000 });
                this.cambio.emit();
            },
            error: (e) => {
                this.subiendoFirmado = null;
                this._snackBar.open(mensajeError(e, 'No se pudo subir el contrato firmado.'), 'Cerrar', { duration: 5000 });
            }
        });
    }

    descargarFirmado(c: Contrato): void {
        this._service.descargarContratoFirmado(this.colaboradorId, c.contratoId).subscribe({
            next: (blob) => {
                const url = URL.createObjectURL(blob);
                const enlace = document.createElement('a');
                enlace.href = url;
                enlace.download = c.archivoFirmadoNombre ?? 'contrato';
                enlace.click();
                // sin esperar, Firefox puede cancelar la descarga: la URL se libera después
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            },
            error: (e) => this._snackBar.open(mensajeError(e, 'No se pudo descargar el contrato firmado.'), 'Cerrar', { duration: 5000 })
        });
    }
}
