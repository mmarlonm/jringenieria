import { Component, Inject, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DocumentEditorModule } from '@onlyoffice/document-editor-angular';

@Component({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-only-office-editor',
  templateUrl: './only-office-editor.component.html',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    DocumentEditorModule
  ]
})
export class OnlyOfficeEditorComponent implements OnInit, OnDestroy {

  editorConfig: any;
  documentServerUrl: string;
  isDocumentAvailable = false;
  cargando = true;
  tardando = false;
  errorCarga = false;
  mensajeError = '';
  private _timer: any;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    this.documentServerUrl = data?.documentServerUrl;
    this.editorConfig = data?.editorConfig;
  }

  ngOnInit(): void {
    // Si el editor tarda más de 20 s, mostrar aviso no destructivo sin desmontar el editor
    this._timer = setTimeout(() => {
      if (this.cargando) {
        this.tardando = true;
      }
    }, 20000);
  }

  ngOnDestroy(): void {
    if (this._timer) {
      clearTimeout(this._timer);
    }
  }

  onDocumentReady = () => {
    this.cargando = false;
    this.tardando = false;
    this.errorCarga = false;
    if (this._timer) {
      clearTimeout(this._timer);
    }
  }

  onLoadComponentError = (errorCode: any, errorDescription: any) => {
    this.cargando = false;
    this.tardando = false;
    this.errorCarga = true;
    this.mensajeError = 'No se pudo abrir el editor';
    if (this._timer) {
      clearTimeout(this._timer);
    }
  }

  descargar(): void {
    if (this.data?.onDescargar) {
      this.data.onDescargar();
    }
  }

  onDocumentStateChange(event: any): void {
    // Manejo de eventos de guardado del editor
  }
}
