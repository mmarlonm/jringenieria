import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialogModule } from '@angular/material/dialog'; // Importa este módulo para los diálogos
import { MatTableModule } from '@angular/material/table'; // Importa este módulo para la tabla
import { MatPaginatorModule } from '@angular/material/paginator'; // Importa para la paginación
import { MatFormFieldModule } from '@angular/material/form-field'; // Importa para los formularios
import { MatInputModule } from '@angular/material/input'; // Importa para los inputs
import { MatButtonModule } from '@angular/material/button'; // Importa para los botones
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-proyecto-historial-modal',
  templateUrl: './historial.component.html',
  standalone: true, // Utilizado en Angular 14+ para componentes independientes (standalone)
  imports: [
    CommonModule,
    MatDialogModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ]
})
export class HistorialComponent {
  displayedColumns: string[] = ['estatusAnterior', 'estatusNuevo', 'fechaCambio', 'comentarios'];
  dataSource = new MatTableDataSource<any>(); // Usamos MatTableDataSource para paginación y filtrado

  constructor(
    public dialogRef: MatDialogRef<HistorialComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    // Asignamos los datos pasados al modal a dataSource
    this.dataSource.data = data.historial;
  }

  // Método para aplicar el filtro a la tabla
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
}