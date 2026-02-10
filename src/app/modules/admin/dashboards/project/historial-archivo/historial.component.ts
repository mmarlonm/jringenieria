import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-proyecto-historial-modal',
  templateUrl: './historial.component.html',
  standalone: true,
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
  displayedColumns: string[] = ['nombreArchivo', 'categoria', 'usuarioNombre', 'fechaEdicion'];
  dataSource = new MatTableDataSource<any>();

  constructor(
    public dialogRef: MatDialogRef<HistorialComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    const historial = data.historial || [];
    const usuarios = data.usuarios || [];

    // 🔄 Enlazamos nombre de usuario al historial
    this.dataSource.data = historial.map((h: any) => {
      const usuario = usuarios.find((u: any) => u.usuarioId === h.usuarioId);
      return {
        ...h,
        usuarioNombre: usuario ? usuario.nombreUsuario : '—'
      };
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
}
