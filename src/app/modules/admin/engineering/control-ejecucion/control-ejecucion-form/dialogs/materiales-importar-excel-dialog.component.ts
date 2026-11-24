import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  EngineeringService,
  ImportacionExcelRespuesta,
  VistaPreviaExcelMateriales
} from '../../../engineering.service';

export interface MaterialesImportarExcelDialogData {
  idSeguimiento: number;
}

/** Lo que devuelve el diálogo si se importó. Cerrar sin importar devuelve `undefined`. */
export interface MaterialesImportarExcelDialogResult {
  importado: true;
  resultado: ImportacionExcelRespuesta;
}

/** Carpeta de «Archivos y evidencias» donde se sube la lista de materiales. */
export const CARPETA_MATERIALES = 'Materiales';
const EXTENSIONES_EXCEL = /\.(xlsx|xlsm|xls)$/i;
const TAM_MAXIMO_MB = 10;
/** Filas que se dibujan de la vista previa (el resumen y las advertencias cubren todas). */
export const FILAS_VISIBLES_MAX = 200;

@Component({
  selector: 'app-materiales-importar-excel-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './materiales-importar-excel-dialog.component.html'
})
export class MaterialesImportarExcelDialogComponent implements OnInit {
  readonly filasVisiblesMax = FILAS_VISIBLES_MAX;

  /** Rutas (relativas a la carpeta Materiales) de los Excel disponibles. */
  archivos: string[] = [];
  cargandoArchivos = false;
  errorArchivos: string | null = null;

  seleccionado: string | null = null;
  vista: VistaPreviaExcelMateriales | null = null;
  previsualizando = false;
  importando = false;
  subiendo = false;
  /** Error de la vista previa, de la importación o de la subida: se ve aquí mismo, sin cerrar el diálogo. */
  errorMensaje: string | null = null;

  /** Una vista previa que llega tarde (se cambió de archivo) no debe pisar a la actual. */
  private solicitudVista = 0;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: MaterialesImportarExcelDialogData,
    private dialogRef: MatDialogRef<MaterialesImportarExcelDialogComponent, MaterialesImportarExcelDialogResult>,
    private engineering: EngineeringService
  ) { }

  ngOnInit(): void {
    this.cargarArchivos();
  }

  get puedeImportar(): boolean {
    const r = this.vista?.resumen;
    return !!r && (r.agregar + r.actualizar) > 0 && !this.importando && !this.previsualizando;
  }

  cargarArchivos(seleccionar?: string): void {
    this.cargandoArchivos = true;
    this.errorArchivos = null;
    this.engineering.getArchivosEjecucion(this.data.idSeguimiento).subscribe({
      next: (lista) => {
        this.cargandoArchivos = false;
        this.archivos = (lista || [])
          .filter(a => a?.tipo === CARPETA_MATERIALES && typeof a?.nombreArchivo === 'string' && EXTENSIONES_EXCEL.test(a.nombreArchivo))
          .map(a => a.nombreArchivo as string)
          .sort((a, b) => a.localeCompare(b));
        if (seleccionar && this.archivos.includes(seleccionar)) {
          this.seleccionar(seleccionar);
        }
      },
      error: () => {
        this.cargandoArchivos = false;
        this.errorArchivos = 'No se pudo cargar la lista de archivos. Intenta de nuevo.';
      }
    });
  }

  seleccionar(nombre: string): void {
    if (this.importando) {
      return;
    }
    this.seleccionado = nombre;
    this.vista = null;
    this.errorMensaje = null;
    this.previsualizar();
  }

  previsualizar(): void {
    if (!this.seleccionado) {
      return;
    }
    const solicitud = ++this.solicitudVista;
    this.previsualizando = true;
    this.engineering.previsualizarExcelMateriales(this.data.idSeguimiento, this.seleccionado).subscribe({
      next: (vista) => {
        if (solicitud !== this.solicitudVista) {
          return;
        }
        this.previsualizando = false;
        this.vista = vista;
      },
      error: (err: HttpErrorResponse) => {
        if (solicitud !== this.solicitudVista) {
          return;
        }
        this.previsualizando = false;
        this.errorMensaje = this.mensajeDe(err, 'No se pudo leer el archivo. Revisa que sea la lista de materiales.');
      }
    });
  }

  importar(): void {
    if (!this.puedeImportar || !this.seleccionado) {
      return;
    }
    this.bloquear(true);
    this.errorMensaje = null;
    this.engineering.importarExcelMateriales(this.data.idSeguimiento, this.seleccionado).subscribe({
      next: (resultado) => {
        this.dialogRef.close({ importado: true, resultado });
      },
      error: (err: HttpErrorResponse) => {
        this.bloquear(false);
        this.errorMensaje = this.mensajeDe(err, 'No se pudo importar el archivo. Intenta de nuevo.');
      }
    });
  }

  /** Sube un Excel a la carpeta Materiales con el servicio de archivos de siempre y lo deja seleccionado. */
  alElegirArchivo(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada?.files?.[0];
    if (entrada) {
      entrada.value = '';
    }
    if (!archivo) {
      return;
    }
    if (!EXTENSIONES_EXCEL.test(archivo.name)) {
      this.errorMensaje = 'Solo se aceptan archivos de Excel (.xlsx, .xlsm o .xls).';
      return;
    }
    if (archivo.size > TAM_MAXIMO_MB * 1024 * 1024) {
      this.errorMensaje = `El archivo no puede pesar más de ${TAM_MAXIMO_MB} MB.`;
      return;
    }
    this.errorMensaje = null;
    this.subiendo = true;
    this.engineering.subirArchivoEjecucion(this.data.idSeguimiento, archivo, CARPETA_MATERIALES).subscribe({
      next: () => {
        this.subiendo = false;
        this.cargarArchivos(archivo.name);
      },
      error: (err: HttpErrorResponse) => {
        this.subiendo = false;
        this.errorMensaje = this.mensajeDe(err, 'No se pudo subir el archivo. Intenta de nuevo.');
      }
    });
  }

  cancelar(): void {
    if (this.importando) {
      return;
    }
    this.dialogRef.close();
  }

  private bloquear(valor: boolean): void {
    this.importando = valor;
    this.dialogRef.disableClose = valor;
  }

  private mensajeDe(err: HttpErrorResponse, generico: string): string {
    const mensaje = err?.error?.mensaje;
    return typeof mensaje === 'string' && mensaje.trim() ? mensaje : generico;
  }
}
