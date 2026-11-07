import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { CalendarioGoogle, CalendarioService } from 'app/modules/admin/calendario/calendario.service';

/** Último calendario usado al aprobar ('' = la última vez se aprobó sin calendario). Solo comodidad: si el navegador no lo guarda, no pasa nada. */
export const CALENDARIO_GUARDADO = 'rrhh.aprobaciones.calendarioId';

export interface AprobarDialogResultado {
    /** Calendario de Google donde registrar la ausencia; null = no registrarla. */
    calendarioId: string | null;
}

/**
 * Confirma la aprobación de RRHH y deja elegir, entre los calendarios de Google de quien aprueba donde puede escribir
 * (propios o compartidos), cuál recibirá la ausencia. El calendario es opcional: sin Google conectado se aprueba igual.
 */
@Component({
    selector: 'rrhh-aprobar-dialog',
    standalone: true,
    imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatSelectModule],
    template: `
        <h2 mat-dialog-title>Aprobar solicitud de {{ data.colaborador }}</h2>
        <mat-dialog-content>
            <p class="text-secondary mb-3">{{ data.tipo }}</p>

            @if (cargando()) {
                <div class="text-secondary text-sm">Cargando tus calendarios de Google…</div>
            } @else if (aviso()) {
                <div class="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-sm text-amber-800 dark:text-amber-200">
                    {{ aviso() }} Puedes aprobar sin calendario.
                </div>
            } @else {
                <mat-checkbox [formControl]="agregar">Agregar al calendario de Google</mat-checkbox>
                @if (agregar.value) {
                    <mat-form-field appearance="outline" class="w-full mt-3" subscriptSizing="dynamic">
                        <mat-label>Calendario</mat-label>
                        <mat-select [formControl]="calendarioId">
                            @for (c of calendarios(); track c.id) {
                                <mat-option [value]="c.id">{{ c.nombre }}{{ c.esPrincipal ? ' (principal)' : '' }}</mat-option>
                            }
                        </mat-select>
                    </mat-form-field>
                    <p class="text-xs text-secondary mt-2">Se registra como evento de todo el día, sin el motivo de la solicitud, y solo con la aprobación final de RRHH. Un calendario compartido lo ve todo el equipo.</p>
                }
            }
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-stroked-button type="button" mat-dialog-close>Cancelar</button>
            <button mat-flat-button color="primary" type="button" [disabled]="!puedeAprobar" (click)="aprobar()">Aprobar</button>
        </mat-dialog-actions>
    `
})
export class AprobarDialogComponent implements OnInit {
    readonly data = inject<{ colaborador: string; tipo: string }>(MAT_DIALOG_DATA);
    private readonly _ref = inject<MatDialogRef<AprobarDialogComponent, AprobarDialogResultado>>(MatDialogRef);
    private readonly _calendario = inject(CalendarioService);

    readonly calendarios = signal<CalendarioGoogle[]>([]);
    readonly cargando = signal(true);
    readonly aviso = signal<string | null>(null);

    readonly agregar = new FormControl(false, { nonNullable: true });
    readonly calendarioId = new FormControl('', { nonNullable: true });

    get puedeAprobar(): boolean {
        return !this.agregar.value || !!this.calendarioId.value;
    }

    ngOnInit(): void {
        this._calendario.calendarios().subscribe({
            next: (todos) => {
                const escribibles = todos.filter((c) => c.rol === 'owner' || c.rol === 'writer');
                this.calendarios.set(escribibles);
                if (escribibles.length === 0) {
                    this.aviso.set('Conectaste Google, pero no tienes ningún calendario de Google donde se pueda escribir.');
                } else {
                    const guardado = this.leerGuardado();
                    if (guardado && escribibles.some((c) => c.id === guardado)) {
                        this.calendarioId.setValue(guardado);
                        this.agregar.setValue(true);
                    }
                }
                this.cargando.set(false);
            },
            error: (e) => {
                // 409: sin cuenta de Google conectada o con el permiso revocado
                this.aviso.set(e?.status === 409 && e?.error?.mensaje ? e.error.mensaje : 'No se pudieron cargar tus calendarios de Google.');
                this.cargando.set(false);
            }
        });
    }

    aprobar(): void {
        if (!this.puedeAprobar) return;
        const elegido = this.agregar.value ? this.calendarioId.value : null;
        if (!this.aviso()) this.guardar(elegido ?? '');
        this._ref.close({ calendarioId: elegido });
    }

    private leerGuardado(): string {
        try {
            return localStorage.getItem(CALENDARIO_GUARDADO) ?? '';
        } catch {
            return '';
        }
    }

    private guardar(valor: string): void {
        try {
            localStorage.setItem(CALENDARIO_GUARDADO, valor);
        } catch {
            /* sin almacenamiento: se pregunta de nuevo la próxima vez */
        }
    }
}
