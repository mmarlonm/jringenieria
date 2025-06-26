import { Component, NgModule, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@microsoft/signalr';
import { QuotesService } from '../quotes-products.service'
import { MatTableModule } from '@angular/material/table';

@Component({
    selector: 'app-add-product-dialog',
  templateUrl: './add-product-dialog.component.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    MatTableModule
  ]
})
export class AddProductDialogComponent implements OnInit {
  query = '';
  resultados: any[] = [];
  cantidad = 1;
  descuento = 0;

  displayedColumns: string[] = [
  'nombreProducto',
  'codigoProducto',
  'unidadMedida',
  'precio',
  'cantidad',
  'descuento',
  'accion'
];

  constructor(
    private dialogRef: MatDialogRef<AddProductDialogComponent>,
    private quotesService: QuotesService
  ) {}

  ngOnInit(): void {
    }

  buscar() {
  if (!this.query.trim()) return;

  this.quotesService.buscarProducto(this.query).subscribe((res) => {
    this.resultados = res.map(p => ({
      ...p,
      cantidad: 1,
      descuento: 0
    }));
  });
}

seleccionar(producto: any) {
  this.dialogRef.close({
    productoId: producto.productoId,
    nombreProducto: producto.nombreProducto,
    cantidad: producto.cantidad,
    precioUnitario: producto.precio,
    descuento: producto.descuento
  });
}

  cancelar() {
    this.dialogRef.close(null);
  }
}