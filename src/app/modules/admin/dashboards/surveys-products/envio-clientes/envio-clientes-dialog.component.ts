import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { concatMap, from, of, catchError, toArray } from 'rxjs';

import { EnvioClientesService } from './envio-clientes.service';
import {
    DestinatarioClienteDto,
    EnvioEncuestaDetalle,
    EnvioEncuestaResultadoDto,
} from './envio-clientes.types';
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

export interface EnvioClientesDialogData {
    formularioId: number;
    titulo: string;
}

@Component({
    selector: 'app-envio-clientes-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatCheckboxModule,
        MatTabsModule,
        MatTooltipModule,
        MatProgressBarModule,
        MatProgressSpinnerModule,
        MatPaginatorModule,
    ],
    templateUrl: './envio-clientes-dialog.component.html',
})
export class EnvioClientesDialogComponent implements OnInit {
    readonly data = inject<EnvioClientesDialogData>(MAT_DIALOG_DATA);
    readonly dialogRef = inject(MatDialogRef<EnvioClientesDialogComponent>);
    private readonly _envioService = inject(EnvioClientesService);

    // Estado base
    readonly lista = signal<DestinatarioClienteDto[]>([]);
    readonly estado = signal<'activos' | 'inactivos'>('activos');
    readonly texto = signal<string>('');
    readonly soloConCorreo = signal<boolean>(false);
    readonly seleccion = signal<Set<number>>(new Set());
    readonly correosLibresTexto = signal<string>('');

    // Estado de carga y proceso
    readonly cargando = signal<boolean>(false);
    readonly enviando = signal<boolean>(false);
    readonly progreso = signal<{ lote: number; total: number } | null>(null);
    readonly resultado = signal<EnvioEncuestaResultadoDto | null>(null);
    readonly error = signal<string | null>(null);
    readonly confirmando = signal<boolean>(false);

    // Paginación cliente
    readonly pagina = signal<number>(0);
    readonly tamanoPagina = signal<number>(50);

    // Valores calculados con computed()
    readonly contadores = computed(() => contarPorEstado(this.lista()));

    readonly filtrados = computed(() =>
        filtrar(this.lista(), {
            estado: this.estado(),
            texto: this.texto(),
            soloConCorreo: this.soloConCorreo(),
        })
    );

    readonly ordenados = computed(() => ordenar(this.filtrados()));

    readonly visiblesPaginados = computed(() => {
        const inicio = this.pagina() * this.tamanoPagina();
        return this.ordenados().slice(inicio, inicio + this.tamanoPagina());
    });

    readonly analisisLibres = computed(() => analizarCorreosLibres(this.correosLibresTexto()));

    readonly totalCorreosLibresTokens = computed(() => {
        const a = this.analisisLibres();
        return a.validos.length + a.invalidos.length + a.repetidos;
    });

    readonly maximoCorreosSuperado = computed(() => this.totalCorreosLibresTokens() > 200);

    readonly resumen = computed(() =>
        resumen(this.lista(), this.seleccion(), this.analisisLibres().validos)
    );

    // «Todos los visibles» = todo lo que cumple el filtro y la búsqueda actuales, no solo la página que se está viendo
    // (con 170 clientes activos con correo, la página de 50 dejaba la mayoría sin marcar).
    readonly todosVisiblesSeleccionados = computed(() => {
        const seleccionables = this.ordenados().filter(esSeleccionable);
        if (seleccionables.length === 0) {
            return false;
        }
        return seleccionables.every((d) => this.seleccion().has(d.clienteId));
    });

    readonly algunosVisiblesSeleccionados = computed(() => {
        const seleccionables = this.ordenados().filter(esSeleccionable);
        const marcados = seleccionables.filter((d) => this.seleccion().has(d.clienteId));
        return marcados.length > 0 && marcados.length < seleccionables.length;
    });

    readonly textoConfirmacion = computed(() => {
        const res = this.resumen();
        const titulo = this.data?.titulo || '';
        if (res.correosLibres > 0) {
            return `Vas a enviar «${titulo}» a ${res.clientes} clientes y ${res.correosLibres} correos escritos (${res.destinatariosUnicos} destinatarios únicos).`;
        }
        return `Vas a enviar «${titulo}» a ${res.clientes} clientes (${res.destinatariosUnicos} correos únicos).`;
    });

    ngOnInit(): void {
        this.cargarDestinatarios();
    }

    cargarDestinatarios(): void {
        this.cargando.set(true);
        this.error.set(null);
        this._envioService.obtenerDestinatarios('todos').subscribe({
            next: (destinatarios) => {
                this.lista.set(destinatarios);
                this.cargando.set(false);
            },
            error: (err) => {
                this.cargando.set(false);
                const mensaje = err?.error?.mensaje || 'No fue posible cargar destinatarios';
                this.error.set(mensaje);
            },
        });
    }

    cambiarEstado(nuevo: 'activos' | 'inactivos'): void {
        this.estado.set(nuevo);
        this.pagina.set(0);
    }

    cambiarTexto(valor: string): void {
        this.texto.set(valor);
        this.pagina.set(0);
    }

    cambiarSoloConCorreo(valor: boolean): void {
        this.soloConCorreo.set(valor);
        this.pagina.set(0);
    }

    onPageChange(event: PageEvent): void {
        this.pagina.set(event.pageIndex);
        this.tamanoPagina.set(event.pageSize);
    }

    alternarSeleccion(clienteId: number): void {
        const nuevo = new Set(this.seleccion());
        if (nuevo.has(clienteId)) {
            nuevo.delete(clienteId);
        } else {
            nuevo.add(clienteId);
        }
        this.seleccion.set(nuevo);
    }

    alternarTodosVisibles(): void {
        const nuevo = alternarTodos(this.ordenados(), this.seleccion());
        this.seleccion.set(nuevo);
    }

    limpiarSeleccion(): void {
        this.seleccion.set(new Set());
    }

    esFilaSeleccionable(d: DestinatarioClienteDto): boolean {
        return esSeleccionable(d);
    }

    confirmar(): string {
        this.confirmando.set(true);
        return this.textoConfirmacion();
    }

    cancelarConfirmacion(): void {
        this.confirmando.set(false);
    }

    enviar(): void {
        if (this.enviando()) {
            return;
        }

        const prep = prepararEnvio(this.lista(), this.seleccion(), this.analisisLibres().validos);
        if (prep.destinatarios === 0) {
            return;
        }

        this.enviando.set(true);
        this.dialogRef.disableClose = true;
        this.error.set(null);
        this.confirmando.set(false);

        if (prep.lotes.length === 0) {
            this.enviando.set(false);
            this.dialogRef.disableClose = false;
            return;
        }

        from(prep.lotes)
            .pipe(
                concatMap((lote, index) => {
                    this.progreso.set({ lote: index + 1, total: prep.lotes.length });
                    return this._envioService
                        .enviar(this.data.formularioId, lote.clienteIds, lote.correosLibres)
                        .pipe(
                            catchError((err) => {
                                // Nunca se muestra err.message: en un error HTTP trae la URL completa de la petición.
                                const mensajeError =
                                    err?.error?.mensaje ||
                                    (err?.status === 0 ? 'No hay conexión con el servidor.' : 'No se pudo enviar el lote.');
                                const detalleFallidos: EnvioEncuestaDetalle[] = [
                                    ...lote.clienteIds.map((id) => {
                                        const c = this.lista().find((cli) => cli.clienteId === id);
                                        return {
                                            clienteId: id,
                                            nombre: c?.nombre || `Cliente ${id}`,
                                            resultado: 'fallido' as const,
                                            motivo: mensajeError,
                                        };
                                    }),
                                    ...lote.correosLibres.map((correo) => ({
                                        clienteId: null,
                                        nombre: correo,
                                        resultado: 'fallido' as const,
                                        motivo: mensajeError,
                                    })),
                                ];
                                return of({
                                    totalProcesados: lote.clienteIds.length + lote.correosLibres.length,
                                    enviados: 0,
                                    omitidos: 0,
                                    fallidos: detalleFallidos.length,
                                    detalle: detalleFallidos,
                                });
                            })
                        );
                }),
                toArray()
            )
            .subscribe({
                next: (resultadosLotes) => {
                    let enviados = 0;
                    let omitidos = 0;
                    let fallidos = 0;
                    const detalle: EnvioEncuestaDetalle[] = [];

                    for (const r of resultadosLotes) {
                        enviados += r.enviados;
                        omitidos += r.omitidos;
                        fallidos += r.fallidos;
                        detalle.push(...r.detalle);
                    }

                    for (const o of prep.omitidosLocales) {
                        omitidos++;
                        detalle.push({
                            clienteId: o.clienteId,
                            nombre: o.nombre,
                            resultado: 'omitido',
                            motivo: o.motivo,
                        });
                    }

                    const totalProcesados = prep.destinatarios + prep.omitidosLocales.length;

                    this.resultado.set({
                        totalProcesados,
                        enviados,
                        omitidos,
                        fallidos,
                        detalle,
                    });
                    this.enviando.set(false);
                    this.dialogRef.disableClose = false;
                    this.progreso.set(null);
                },
                error: (err) => {
                    this.enviando.set(false);
                    this.dialogRef.disableClose = false;
                    this.progreso.set(null);
                    this.error.set(err?.error?.mensaje || 'Error al procesar el envío.');
                },
            });
    }

    cerrar(): void {
        if (this.enviando()) {
            return;
        }
        this.dialogRef.close(this.resultado());
    }
}

