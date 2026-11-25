import { Component, Inject, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from "@angular/material/icon";
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
  isDocumentAvailable = false; // para mostrar un mensaje si no existe
  cargando = true;
  errorCarga = false;
  mensajeError = '';
  private _timer: any;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    console.log('OnlyOfficeEditorComponent - data recibida:', data);
    this.documentServerUrl = data?.documentServerUrl;
    this.editorConfig = data?.editorConfig;

    console.log('OnlyOfficeEditorComponent - documentServerUrl:', this.documentServerUrl);
    console.log('OnlyOfficeEditorComponent - editorConfig:', this.editorConfig);
  }

  ngOnInit(): void {
    // Si el editor no carga en 20 s, mostrar mensaje y botón Descargar
    this._timer = setTimeout(() => {
      if (this.cargando) {
        this.cargando = false;
        this.errorCarga = true;
        this.mensajeError = 'No se pudo abrir el editor';
      }
    }, 20000);
  }

  ngOnDestroy(): void {
    if (this._timer) {
      clearTimeout(this._timer);
    }
  }

  onDocumentReady = () => {
    console.log("Document is loaded");
    this.cargando = false;
    this.errorCarga = false;
    if (this._timer) {
      clearTimeout(this._timer);
    }
    const documentEditor = (window as any).DocEditor?.instances?.["docxEditor"];
    if (documentEditor?.showMessage) {
      documentEditor.showMessage("Welcome to ONLYOFFICE Editor!");
    }
  }

  onLoadComponentError = (errorCode: any, errorDescription: any) => {
    console.log("Error loading component");
    console.log("Código:", errorCode);
    console.log("Descripción:", errorDescription);
    this.cargando = false;
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

  onDocumentStateChange(event: any) {
    console.log('Evento DocumentStateChange:', event);
    if (event.type === 'onSave') {
      console.log('Documento guardado, backend respondió:', event.data);
    }
  }
}
