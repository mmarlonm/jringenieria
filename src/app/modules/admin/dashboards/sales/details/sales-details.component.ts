import { Component, OnInit, LOCALE_ID } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SalesService } from "../sales.services";
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
  FormControl,
} from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MAT_DATE_LOCALE, MatNativeDateModule } from "@angular/material/core";
import { CommonModule } from "@angular/common";
import { CurrencyMaskPipe } from "../../../../../pipes/currency-mask.pipe";
import { ClientsService } from "../../../catalogs/clients/clients.service";
import { debounceTime } from "rxjs";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";
import { registerLocaleData } from "@angular/common";
import localeEs from "@angular/common/locales/es";
import { UsersService } from "../../../security/users/users.service";
import { MatTabsModule } from "@angular/material/tabs";
import { MatIconModule } from "@angular/material/icon";
import { ProjectService } from "../../project/project.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import Swal from 'sweetalert2'

@Component({
  selector: "app-sales-details",
  templateUrl: "./sales-details.component.html",
  styleUrls: ["./sales-details.component.scss"],
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
    CurrencyMaskPipe,
    NgxMatSelectSearchModule,
    MatTabsModule,
    MatIconModule,
  ],
  providers: [
    { provide: LOCALE_ID, useValue: "es-ES" },
    { provide: MAT_DATE_LOCALE, useValue: "es-ES" },
  ],
})
export class SalesDetailsComponent implements OnInit {
  salesForm: FormGroup;
  ventaId: number | null = null;
  usuarioId: number | null = null;

  clients: any[] = [];
  proyects: any[] = [];
  paymentMethods: any[] = [];
  unidadesNegocio: any[] = [];

  constructor(
    private fb: FormBuilder,
    private salesService: SalesService,
    private clientsService: ClientsService,
    private usersService: UsersService,
    private route: ActivatedRoute,
    public router: Router,
    public projectService: ProjectService,
    private snackBar: MatSnackBar,
  ) { }

  ngOnInit(): void {
    this.salesForm = this.fb.group({
      ventaId: [0], // ID generado por backend, no requerido aquí
      fecha: [null, Validators.required], // DateTime => requerido
      serie: [null, Validators.maxLength(10)], // opcional
      folio: [null, Validators.maxLength(20)], // opcional
      total: [0, Validators.required], // decimal? => pero lo estás requiriendo en frontend, está bien si lo necesitas obligatorio
      pendiente: [0], // opcional
      uuid: [null, Validators.maxLength(50)], // opcional (Guid?)
      clienteId: [null, Validators.required], // requerido
      usuarioId: [null, Validators.required], // requerido
      formaPagoId: [null, Validators.required], // requerido
      unidadNegocioId: [null, Validators.required], // requerido
      proyectoId: [null, Validators.required], // no está en el DTO pero asumimos que es necesario
    });

    this.route.paramMap.subscribe((params) => {
      const id = params.get("id");
      if (!id || id === "new") {
        this.ventaId = null;
      } else {
        this.ventaId = Number(id);
        this.loadVenta(this.ventaId);
      }
    });

    this.loadClients();
    this.loadUsers();
    this.loadPaymentMethods();
    this.loadUnidades();

    const userData = JSON.parse(this.salesService.userInformation);
    this.usuarioId = userData.usuario.id;
    this.salesForm.get("usuarioId").setValue(userData.usuario.id);
  }

  loadVenta(id: number): void {
    this.salesService.getVentaById(id).subscribe((res) => {
      if (res.code == 200) {
        var venta = res.data;
        if (venta) this.salesForm.patchValue(venta);
      } else {
        Swal.fire({
          icon: "error",
          title: "Opps",
          text: "Hubo un error en el sistema, contacte al administrador del sistema.",
          draggable: true
        });
      }
    });
  }

  saveVenta(): void {
    if (this.salesForm.invalid) {
      Swal.fire({
        icon: "error",
        title: "Opps",
        text: "Por favor, completa los campos obligatorios",
        draggable: true
      });
      return;
    }

    const data = this.salesForm.value;
    this.salesService.createVenta(data).subscribe((res) => {
      if (res.code == 200) {
        this.router.navigate(["/dashboards/sales"]);
        const message = this.ventaId ? 'Cotización actualizada correctamente' : 'Cotización guardada correctamente';
        this.snackBar.open(message, 'Cerrar', { duration: 3000 });
      } else {
        Swal.fire({
          icon: "error",
          title: "Opps",
          text: "Hubo un error en el sistema, contacte al administrador del sistema.",
          draggable: true
        });
      }
    });
  }

  loadClients(): void {
    this.clientsService.getClient().subscribe((clients) => {
      this.clients = clients;
    });
  }

  loadUsers(): void {
    this.projectService.getProjects().subscribe((proyects: any) => {
      this.proyects = proyects.data
    });
  }

  loadPaymentMethods(): void {
    this.salesService.getFormasDePago().subscribe((methods) => {
      this.paymentMethods = methods;
    });
  }

  loadUnidades(): void {
    this.projectService.getUnidadesDeNegocio().subscribe((methods) => {
      this.unidadesNegocio = methods;
    });
  }

  updateValue(event: Event, controlName: string) {
    let input = event.target as HTMLInputElement;
    let rawValue = input.value.replace(/[^0-9.]/g, "");
    this.salesForm.get(controlName)?.setValue(rawValue);
  }
}