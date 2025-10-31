import { Component, Inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
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
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    DocumentEditorModule
  ]
})
export class OnlyOfficeEditorComponent {

  editorConfig: any;
  documentServerUrl: string;
  isDocumentAvailable = false; // para mostrar un mensaje si no existe

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    console.log('OnlyOfficeEditorComponent - data recibida:', data);
    this.documentServerUrl = data.documentServerUrl;
    this.editorConfig = data.editorConfig;

    console.log('OnlyOfficeEditorComponent - documentServerUrl:', this.documentServerUrl);
    console.log('OnlyOfficeEditorComponent - editorConfig:', this.editorConfig);

  }


  onDocumentReady = () => {
    console.log("Document is loaded");
    const documentEditor = window.DocEditor.instances["docxEditor"];

  documentEditor.showMessage("Welcome to ONLYOFFICE Editor!");
  }

  onLoadComponentError = (errorCode, errorDescription) => {
    console.log("Error loading component");
    console.log("Código:", errorCode);
    console.log("Descripción:", errorDescription);
  }

  onDocumentStateChange(event: any) {
  console.log('Evento DocumentStateChange:', event);
  
  // event tiene propiedades como:
  // event.type -> "documentStateChanged", "onSaveAs", etc.
  // event.data -> contiene status, key, etc.
  
  if (event.type === 'onSave') {
    console.log('Documento guardado, backend respondió:', event.data);
  }
}
}
