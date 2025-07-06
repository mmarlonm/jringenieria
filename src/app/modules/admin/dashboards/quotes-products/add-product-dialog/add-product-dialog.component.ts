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
  styleUrls: ['./add-product-dialog.component.scss'],
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
    'expandir',
    'nombreProducto',
    'codigoProducto',
    'unidadMedida',
    'precio',
    'cantidad',
    'descuento',
    'stock',
    'almacen',
    'accion'
  ];

  expandedElement: any | null = null;

  periodos = [
    { campo: 'costoEntradasPeriodo1', label: 'Ene' },
    { campo: 'costoEntradasPeriodo2', label: 'Feb' },
    { campo: 'costoEntradasPeriodo3', label: 'Mar' },
    { campo: 'costoEntradasPeriodo4', label: 'Abr' },
    { campo: 'costoEntradasPeriodo5', label: 'May' },
    { campo: 'costoEntradasPeriodo6', label: 'Jun' },
    { campo: 'costoEntradasPeriodo7', label: 'Jul' },
    { campo: 'costoEntradasPeriodo8', label: 'Ago' },
    { campo: 'costoEntradasPeriodo9', label: 'Sep' },
    { campo: 'costoEntradasPeriodo10', label: 'Oct' },
    { campo: 'costoEntradasPeriodo11', label: 'Nov' },
    { campo: 'costoEntradasPeriodo12', label: 'Dic' }
  ];

  constructor(
    private dialogRef: MatDialogRef<AddProductDialogComponent>,
    private quotesService: QuotesService
  ) { }

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
      descuento: producto.descuento,
      stock: producto.stock,
      almacen: producto.almacen
    });
  }

  cancelar() {
    this.dialogRef.close(null);
  }

  aplicarPrecio(producto: any, nuevoPrecio: number) {
    producto.precio = nuevoPrecio;
  }
}