import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductsService } from '../products.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
@Component({
  selector: 'app-products-details',
  templateUrl: './products-details.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSlideToggleModule
  ]
})
export class ProductsDetailsComponent implements OnInit {
  productForm: FormGroup;
  categorias: any[] = [];
  unidadesDeNegocio: any[] = [];
  productId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private productsService: ProductsService,
    private route: ActivatedRoute,
    public router: Router,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.productForm = this.fb.group({
      productoId: [0], 
      codigoProducto: ['', Validators.required],
      nombreProducto: ['', Validators.required],
      descripcion: [''],
      proveedor: [''],
      precio: [0, [Validators.required, Validators.min(0)]],
      stock: [0, [Validators.required, Validators.min(0)]],
      unidadMedida: ['', Validators.required],
      categoria: [''],
      fechaCreacion: [new Date().toISOString()], // Fecha actual en formato ISO
      activo: [true]
  });

    this.route.paramMap.subscribe(params => {
        const id = params.get('id');
        if (id === 'new') {
            this.productId = null;
        } else {
            this.productId = Number(id);
            this.loadProduct(this.productId);
        }
    });
  }

  loadProduct(id: number): void {
    this.productsService.getProductById(id).subscribe((Product) => {
        if (Product) {
            this.productForm.patchValue(Product);
        }
    });
  }

  saveProduct(): void {
    if (this.productForm.invalid) return;
  
    const productData: any = this.productForm.value;
  
    if (this.productId) {
      productData.proyectoId = this.productId;
      this.productsService.updateProduct(productData).subscribe(() => {
        this.router.navigate(['/catalogs/products']);
      });
    } else {
      this.productsService.updateProduct(productData).subscribe(() => {
        this.router.navigate(['/catalogs/products']);
      });
    }
  }
}