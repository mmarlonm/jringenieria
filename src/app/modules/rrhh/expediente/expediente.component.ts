import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer } from '@angular/platform-browser';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { DateTime } from 'luxon';
import { Observable } from 'rxjs';
import { mensajeError } from '../colaboradores/colaboradores.utils';
import { ExpedienteService } from './expediente.service';
import { Expediente, ExpedienteDocumento, ExpedienteRenglon } from './expediente.types';
import { MotivoRechazoDialogComponent } from './motivo-rechazo-dialog.component';
import { PreviewDocumentoDialogComponent, TipoVista } from './preview-documento-dialog.component';

const TAMANO_MAXIMO = 10 * 1024 * 1024;
/** Fotografía en el catálogo sembrado: en el celular abre la cámara frontal. */
const TIPO_FOTOGRAFIA = 14;

interface Grupo {
    clave: string;
    titulo: string;
    color: string;
    renglones: ExpedienteRenglon[];
}

/**
 * Expediente digital como lista de pendientes con el % de avance. Sin `colaboradorId` es el del propio colaborador (menú y perfil:
 * sube, ve y quita lo suyo); con `colaboradorId` es la vista de RRHH (valida, rechaza, marca «no aplica» y sube ya validado).
 * Todo el estado es de señales: así se refresca también dentro del perfil, que es OnPush.
 */
@Component({
    selector: 'rrhh-expediente',
    standalone: true,
    templateUrl: './expediente.component.html',
    imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule]
})
export class ExpedienteComponent implements OnInit, OnChanges {
    private readonly _service = inject(ExpedienteService);
    private readonly _snackBar = inject(MatSnackBar);
    private readonly _dialog = inject(MatDialog);
    private readonly _confirmacion = inject(FuseConfirmationService);
    private readonly _sanitizer = inject(DomSanitizer);

    @Input() colaboradorId?: number;
    @ViewChild('selector', { static: true }) selector!: ElementRef<HTMLInputElement>;

    readonly expediente = signal<Expediente | null>(null);
    readonly cargando = signal(false);
    readonly error = signal<string | null>(null);
    readonly ocupados = signal<ReadonlySet<number>>(new Set<number>());
    readonly validadosAbierto = signal(false);
    /** Renglón DC-3 con el mini formulario de curso y vigencia abierto. */
    readonly dc3Abierto = signal<number | null>(null);
    dc3Curso = '';
    dc3Vigencia = '';

    private _objetivo: ExpedienteRenglon | null = null;
    private _extra: { descripcion: string; fechaVigencia: string } | null = null;

    readonly grupos = computed<Grupo[]>(() => {
        const renglones = this.expediente()?.renglones ?? [];
        const de = (filtro: (r: ExpedienteRenglon) => boolean) => renglones.filter(filtro);
        return [
            { clave: 'falta', titulo: 'Falta subir', color: '#ef4444', renglones: de((r) => r.estatus === 'PENDIENTE' || r.estatus === 'VENCIDO') },
            { clave: 'rechazado', titulo: 'Rechazado', color: '#f97316', renglones: de((r) => r.estatus === 'RECHAZADO') },
            { clave: 'revision', titulo: 'En revisión', color: '#3b82f6', renglones: de((r) => r.estatus === 'EN_REVISION') },
            { clave: 'porvencer', titulo: 'Por vencer', color: '#f59e0b', renglones: de((r) => r.estatus === 'VALIDADO' && r.porVencer) },
            { clave: 'validado', titulo: 'Validados', color: '#10b981', renglones: de((r) => r.estatus === 'VALIDADO' && !r.porVencer) },
            { clave: 'noaplica', titulo: 'No aplica', color: '#9ca3af', renglones: de((r) => r.estatus === 'NO_APLICA') }
        ].filter((g) => g.renglones.length > 0);
    });

    get modoRrhh(): boolean {
        return this.colaboradorId != null;
    }

    ngOnInit(): void {
        this.cargar();
    }

    ngOnChanges(cambios: SimpleChanges): void {
        if (cambios['colaboradorId'] && !cambios['colaboradorId'].firstChange) this.cargar();
    }

    cargar(conIndicador = true): void {
        if (conIndicador) this.cargando.set(true);
        const peticion = this.modoRrhh ? this._service.obtener(this.colaboradorId!) : this._service.obtenerMio();
        peticion.subscribe({
            next: (expediente) => {
                this.expediente.set(expediente);
                this.error.set(null);
                this.cargando.set(false);
            },
            error: (e) => {
                this.cargando.set(false);
                const texto = mensajeError(e, 'No se pudo cargar el expediente.');
                // con un expediente a la vista, un fallo al refrescar solo se avisa
                if (this.expediente()) this.aviso(texto);
                else this.error.set(texto);
            }
        });
    }

    anillo(porcentaje: number): string {
        return `conic-gradient(#10b981 0 ${porcentaje}%, #e5e7eb ${porcentaje}% 100%)`;
    }

    /** Días que faltan para la fecha (negativo si ya pasó). */
    diasPara(fecha: string | null): number | null {
        if (!fecha) return null;
        const f = DateTime.fromISO(fecha);
        return f.isValid ? Math.round(f.startOf('day').diff(DateTime.local().startOf('day'), 'days').days) : null;
    }

    /** El documento que explica el estado del renglón (el rechazado con su motivo, el último subido). */
    ultimo(r: ExpedienteRenglon, estatus?: string): ExpedienteDocumento | undefined {
        const docs = estatus ? r.documentos.filter((d) => d.estatus === estatus) : r.documentos;
        return docs[docs.length - 1];
    }

    /** La mayor vigencia entre las constancias validadas (null si ninguna la tiene). */
    vigenciaMaxima(r: ExpedienteRenglon): string | null {
        const fechas = r.documentos.filter((d) => d.estatus === 'VALIDADO' && d.fechaVigencia).map((d) => d.fechaVigencia as string).sort();
        return fechas.length ? fechas[fechas.length - 1] : null;
    }

    puedeQuitar(d: ExpedienteDocumento): boolean {
        return this.modoRrhh || d.estatus !== 'VALIDADO';
    }

    textoSubir(r: ExpedienteRenglon): string {
        if (r.estatus === 'RECHAZADO') return 'Subir de nuevo';
        if (r.estatus === 'VALIDADO' || r.estatus === 'EN_REVISION') return r.permiteVarios ? 'Agregar otra' : 'Reemplazar';
        return r.tipoDocumentoId === TIPO_FOTOGRAFIA ? 'Tomar foto' : 'Subir';
    }

    // ------------------------------------------------------------------ subir

    pedirArchivo(r: ExpedienteRenglon): void {
        if (r.requiereVigencia) {
            this.dc3Curso = '';
            this.dc3Vigencia = '';
            this.dc3Abierto.set(this.dc3Abierto() === r.tipoDocumentoId ? null : r.tipoDocumentoId);
            return;
        }
        this.abrirSelector(r, null);
    }

    elegirArchivoDc3(r: ExpedienteRenglon): void {
        const descripcion = this.dc3Curso.trim();
        if (!descripcion || !this.dc3Vigencia) {
            this.aviso('Indica el nombre del curso y su fecha de vigencia.');
            return;
        }
        this.abrirSelector(r, { descripcion, fechaVigencia: this.dc3Vigencia });
    }

    private abrirSelector(r: ExpedienteRenglon, extra: { descripcion: string; fechaVigencia: string } | null): void {
        this._objetivo = r;
        this._extra = extra;
        const el = this.selector.nativeElement;
        const foto = r.tipoDocumentoId === TIPO_FOTOGRAFIA;
        el.value = '';
        el.accept = foto ? 'image/jpeg,image/png' : 'application/pdf,image/jpeg,image/png';
        if (foto) el.setAttribute('capture', 'user');
        else el.removeAttribute('capture');
        el.click();
    }

    alElegir(evento: Event): void {
        const archivo = (evento.target as HTMLInputElement).files?.[0];
        const renglon = this._objetivo;
        if (!archivo || !renglon) return;
        if (archivo.size > TAMANO_MAXIMO) {
            this.aviso(`El archivo pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el máximo permitido es 10 MB.`);
            return;
        }

        const form = new FormData();
        form.append('tipoDocumentoId', String(renglon.tipoDocumentoId));
        form.append('archivo', archivo, archivo.name);
        if (this._extra) {
            form.append('descripcion', this._extra.descripcion);
            form.append('fechaVigencia', this._extra.fechaVigencia);
        }

        this.ocupar(renglon.tipoDocumentoId, true);
        const peticion = this.modoRrhh ? this._service.subir(this.colaboradorId!, form) : this._service.subirMio(form);
        peticion.subscribe({
            next: () => {
                this.aviso(this.modoRrhh ? 'Documento subido y validado.' : 'Documento subido. RRHH lo revisará.');
                this.dc3Abierto.set(null);
                this.ocupar(renglon.tipoDocumentoId, false);
                this.cargar(false);
            },
            error: (e) => {
                this.ocupar(renglon.tipoDocumentoId, false);
                this.aviso(mensajeError(e, 'No se pudo subir el documento.'));
            }
        });
    }

    // ------------------------------------------------------------------ ver, descargar y formatos

    ver(d: ExpedienteDocumento): void {
        this.archivoDe(d).subscribe({
            next: (blob) => {
                const url = URL.createObjectURL(blob);
                this._dialog
                    .open(PreviewDocumentoDialogComponent, {
                        width: '900px',
                        maxWidth: '95vw',
                        data: { nombre: d.nombreOriginal, tipo: this.tipoVista(d.nombreOriginal), url: this._sanitizer.bypassSecurityTrustResourceUrl(url) }
                    })
                    .afterClosed()
                    .subscribe(() => URL.revokeObjectURL(url));
            },
            error: (e) => this.aviso(mensajeError(e, 'No se pudo abrir el documento.'))
        });
    }

    descargarArchivo(d: ExpedienteDocumento): void {
        this.archivoDe(d).subscribe({
            next: (blob) => this.guardarBlob(blob, d.nombreOriginal),
            error: (e) => this.aviso(mensajeError(e, 'No se pudo descargar el documento.'))
        });
    }

    descargarFormato(r: ExpedienteRenglon): void {
        const peticion = this.modoRrhh ? this._service.formato(r.tipoDocumentoId) : this._service.formatoMio(r.tipoDocumentoId);
        peticion.subscribe({
            next: (blob) => this.guardarBlob(blob, `${r.nombre}.pdf`),
            error: (e) => this.aviso(mensajeError(e, 'No se pudo descargar el formato.'))
        });
    }

    private archivoDe(d: ExpedienteDocumento): Observable<Blob> {
        return this.modoRrhh ? this._service.descargar(d.documentoId) : this._service.descargarMio(d.documentoId);
    }

    private tipoVista(nombre: string): TipoVista {
        const extension = nombre.split('.').pop()?.toLowerCase();
        if (extension === 'pdf') return 'pdf';
        return ['jpg', 'jpeg', 'png'].includes(extension ?? '') ? 'imagen' : 'otro';
    }

    private guardarBlob(blob: Blob, nombre: string): void {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = nombre;
        enlace.click();
        URL.revokeObjectURL(url);
    }

    // ------------------------------------------------------------------ quitar y revisión de RRHH

    quitar(d: ExpedienteDocumento): void {
        this._confirmacion
            .open({
                title: 'Quitar documento',
                message: `¿Quitar «${d.descripcion || d.nombreOriginal}» del expediente?`,
                actions: { confirm: { label: 'Quitar' } }
            })
            .afterClosed()
            .subscribe((resultado) => {
                if (resultado !== 'confirmed') return;
                const peticion = this.modoRrhh ? this._service.eliminar(this.colaboradorId!, d.documentoId) : this._service.eliminarMio(d.documentoId);
                this.ejecutar(peticion, 'No se pudo quitar el documento.');
            });
    }

    validar(d: ExpedienteDocumento): void {
        this.ejecutar(this._service.validar(d.documentoId), 'No se pudo validar el documento.');
    }

    rechazar(r: ExpedienteRenglon, d: ExpedienteDocumento): void {
        this._dialog
            .open(MotivoRechazoDialogComponent, { width: '480px', maxWidth: '95vw', data: { documento: r.nombre } })
            .afterClosed()
            .subscribe((motivo?: string) => {
                if (motivo) this.ejecutar(this._service.rechazar(d.documentoId, motivo), 'No se pudo rechazar el documento.');
            });
    }

    marcarNoAplica(r: ExpedienteRenglon): void {
        this.ejecutar(this._service.marcarNoAplica(this.colaboradorId!, r.tipoDocumentoId), 'No se pudo marcar el documento.');
    }

    quitarNoAplica(r: ExpedienteRenglon): void {
        this.ejecutar(this._service.quitarNoAplica(this.colaboradorId!, r.tipoDocumentoId), 'No se pudo quitar la marca.');
    }

    private ejecutar(peticion: Observable<{ mensaje: string }>, porDefecto: string): void {
        peticion.subscribe({
            next: (r) => {
                this.aviso(r.mensaje);
                this.cargar(false);
            },
            error: (e) => this.aviso(mensajeError(e, porDefecto))
        });
    }

    private ocupar(tipoId: number, ocupado: boolean): void {
        const nuevo = new Set(this.ocupados());
        if (ocupado) nuevo.add(tipoId);
        else nuevo.delete(tipoId);
        this.ocupados.set(nuevo);
    }

    private aviso(texto: string): void {
        this._snackBar.open(texto, 'Cerrar', { duration: 5000 });
    }
}
