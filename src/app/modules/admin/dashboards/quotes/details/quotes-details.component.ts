import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { QuotesService } from '../quotes.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { CurrencyMaskPipe } from '../../../../../pipes/currency-mask.pipe';
@Component({
  selector: 'app-quotes-details',
  templateUrl: './quotes-details.component.html',
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
    CurrencyMaskPipe
  ]
})
export class QuoteDetailsComponent implements OnInit {
  quotesForm: FormGroup;
  estatus: any[] = [];
  unidadesDeNegocio: any[] = [];
  quotesId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private quotesService: QuotesService,
    private route: ActivatedRoute,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.quotesForm = this.fb.group({
      cotizacionId: [0], // ✅ Debe ser número
      cliente: ['', Validators.required], // 🔹 Cambiar de '' a 0
      usuarioCreadorId: [0, Validators.required], // 🔹 Cambiar de '' a 0
      necesidad: ['', [Validators.required, Validators.maxLength(500)]],
      direccion: ['', [Validators.maxLength(255)]],
      nombreContacto: ['', [Validators.maxLength(255)]],
      telefono: ['', [Validators.maxLength(50)]],
      empresa: ['', [Validators.maxLength(255)]],
      cotizacion: ['', [Validators.maxLength(255)]],
      ordenCompra: ['', [Validators.maxLength(255)]],
      contrato: ['', [Validators.maxLength(255)]],
      proveedor: ['', [Validators.maxLength(255)]],
      vendedor: ['', [Validators.maxLength(255)]],
      fechaEntrega: [null], // ✅ Debe ser Date o null
      rutaCritica: ['', [Validators.maxLength(500)]],
      factura: ['', [Validators.maxLength(255)]],
      pago: [null, Validators.pattern(/^\d+(\.\d{1,2})?$/)], // ✅ Debe ser número o null
      utilidadProgramada: [null, Validators.pattern(/^\d+(\.\d{1,2})?$/)],
      utilidadReal: [null, Validators.pattern(/^\d+(\.\d{1,2})?$/)],
      financiamiento: [null, Validators.pattern(/^\d+(\.\d{1,2})?$/)],
      fechaRegistro: [new Date()], // ✅ Enviar como `Date`
      estatus: [0, [Validators.maxLength(50)]]
    });
    this.getEstatus();

    const userData = JSON.parse(this.quotesService.userInformation);
    this.quotesForm.get('usuarioCreadorId').setValue(userData.usuario.id);

    this.route.paramMap.subscribe(params => {
        const id = params.get('id');
        console.log("id de proyecto ", params);
        if (!id || id === 'new') {
            this.quotesId = null; // Se trata de un nuevo proyecto
        } else {
            this.quotesId = Number(id);
            this.loadQuotes(this.quotesId);
        }
    });
  }

  getEstatus(): void {
    this.quotesService.getEstatus().subscribe(data => this.estatus = data);
  }

  loadQuotes(id: number): void {
    this.quotesService.getQuoteById(id).subscribe((quotes) => {
      if (quotes) {
        this.quotesForm.patchValue({
          cotizacionId: quotes.cotizacionId, // 🔹 Ahora se incluye el ID
          cliente: quotes.cliente,
          usuarioCreadorId: quotes.usuarioCreadorId,
          necesidad: quotes.necesidad,
          direccion: quotes.direccion,
          nombreContacto: quotes.nombreContacto,
          telefono: quotes.telefono,
          empresa: quotes.empresa,
          cotizacion: quotes.cotizacion,
          ordenCompra: quotes.ordenCompra,
          contrato: quotes.contrato,
          proveedor: quotes.proveedor,
          vendedor: quotes.vendedor,
          fechaEntrega: quotes.fechaEntrega,
          rutaCritica: quotes.rutaCritica,
          factura: quotes.factura,
          pago: quotes.pago,
          utilidadProgramada: quotes.utilidadProgramada,
          utilidadReal: quotes.utilidadReal,
          financiamiento: quotes.financiamiento,
          fechaRegistro: quotes.fechaRegistro,
          estatus: quotes.estatus
        });
      }
    });
  }

  saveQuotes(): void {
    console.log("guardar cotización", this.quotesForm);
    if (this.quotesForm.invalid) return;
  
    const quotesData: any = this.quotesForm.value;
    console.log("data de quote ", quotesData);
  
    if (this.quotesId) {
      // Actualizar proyecto
      quotesData.cotizacionId = this.quotesId;
      this.quotesService.updateQuote(quotesData).subscribe(() => {
        // Redirigir a la lista de proyectos
        this.router.navigate(['/dashboards/quote']); // O la ruta correspondiente a la lista
      });
    } else {
      // Crear nuevo proyecto
      this.quotesService.createQuote(quotesData).subscribe(() => {
        // Redirigir a la lista de proyectos
        this.router.navigate(['/dashboards/quote']); // O la ruta correspondiente a la lista
      });
    }
  }

  updateValue(event: Event, controlName: string) {
    let input = event.target as HTMLInputElement;
    
    // Remover caracteres no numéricos excepto el punto decimal
    let rawValue = input.value.replace(/[^0-9.]/g, '');
  
    // Actualizar el FormControl dinámicamente
    this.quotesForm.get(controlName)?.setValue(rawValue);
  }
}