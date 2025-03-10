import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectService } from '../project.service';
import { ClientsService} from '../../../catalogs/clients/clients.service'; 
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, AbstractControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-project-details',
  templateUrl: './project-details.component.html',
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
    MatNativeDateModule
  ]
})
export class ProjectDetailsComponent implements OnInit {
  projectForm: FormGroup;
  categorias: any[] = [];
  unidadesDeNegocio: any[] = [];
  clients: any[] = [];
  projectId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private route: ActivatedRoute,
    public router: Router,
    private clientsService: ClientsService
  ) {}

  ngOnInit(): void {
    this.projectForm = this.fb.group({
      proyectoId: [0], // 🔹 Se agrega proyectoId para que siempre se tenga
      nombre: ['', Validators.required],
      categoria: ['', Validators.required],
      lugar: ['NA'],
      unidadDeNegocio: ['', Validators.required],
      fechaInicio: ['', Validators.required],
      fechaFin: [''],
      estado: ['NA'],
    
      // Nuevas propiedades
      //cliente: ['', Validators.required],
      cliente: [0,[Validators.required, this.noZeroValidator]],
      necesidad: [''],
      direccion: [''],
      nombreContacto: [''],
      telefono: [''],
      empresa: [''],
    
      levantamiento: [''],
      planoArquitectonico: [''],
      diagramaIsometrico: [''],
      diagramaUnifilar: [''],
    
      materialesCatalogo: [''],
      materialesPresupuestados: [''],
      inventarioFinal: [''],
      cuadroComparativo: [''],
    
      proveedor: [''],
    
      manoDeObra: [''],
      personasParticipantes: [''],
      equipos: [''],
      herramientas: [''],
    
      indirectosCostos: [''],
      fianzas: [''],
      anticipo: [''],
      cotizacion: [''],
    
      ordenDeCompra: [''],
      contrato: [''],
    
      programaDeTrabajo: [''],
      avancesReportes: [''],
      comentarios: [''],
      hallazgos: [''],
      dosier: [''],
      rutaCritica: [''],
    
      factura: [''],
      pago: [''],
      utilidadProgramada: [''],
      utilidadReal: [''],
      financiamiento: [''],
    
      cierreProyectoActaEntrega: ['']
    });

    this.getCategorias();
    this.getUnidadesDeNegocio();
    this.getClientes();

    this.route.paramMap.subscribe(params => {
        const id = params.get('id');
        if (!id || id === 'new') {
            this.projectId = null; // Se trata de un nuevo proyecto
        } else {
            this.projectId = Number(id);
            this.loadProject(this.projectId);
        }
    });
  }

  noZeroValidator(control: AbstractControl) {
    return control.value === 0 ? { noZero: true } : null;
  }
  getCategorias(): void {
    this.projectService.getCategorias().subscribe(data => this.categorias = data);
  }

  getUnidadesDeNegocio(): void {
    this.projectService.getUnidadesDeNegocio().subscribe(data => this.unidadesDeNegocio = data);
  }

  getClientes(): void {
    this.clientsService.getClient().subscribe(data => this.clients = data);
  }

  loadProject(id: number): void {
    this.projectService.getProjectById(this.projectId).subscribe((projects) => {
      const project = projects;
      if (project) {
        this.projectForm.patchValue({
          proyectoId: project.proyectoId, // 🔹 Ahora se incluye el ID
          nombre: project.nombre,
          categoria: project.categoriaId,
          lugar: project.lugar,
          unidadDeNegocio: project.unidadDeNegocioId,
          fechaInicio: project.fechaInicio,
          fechaFin: project.fechaFin,
          estado: project.estado,
        
          // Nuevas propiedades
          cliente: project.cliente,
          necesidad: project.necesidad,
          direccion: project.direccion,
          nombreContacto: project.nombreContacto,
          telefono: project.telefono,
          empresa: project.empresa,
        
          levantamiento: project.levantamiento,
          planoArquitectonico: project.planoArquitectonico,
          diagramaIsometrico: project.diagramaIsometrico,
          diagramaUnifilar: project.diagramaUnifilar,
        
          materialesCatalogo: project.materialesCatalogo,
          materialesPresupuestados: project.materialesPresupuestados,
          inventarioFinal: project.inventarioFinal,
          cuadroComparativo: project.cuadroComparativo,
        
          proveedor: project.proveedor,
        
          manoDeObra: project.manoDeObra,
          personasParticipantes: project.personasParticipantes,
          equipos: project.equipos,
          herramientas: project.herramientas,
        
          indirectosCostos: project.indirectosCostos,
          fianzas: project.fianzas,
          anticipo: project.anticipo,
          cotizacion: project.cotizacion,
        
          ordenDeCompra: project.ordenDeCompra,
          contrato: project.contrato,
        
          programaDeTrabajo: project.programaDeTrabajo,
          avancesReportes: project.avancesReportes,
          comentarios: project.comentarios,
          hallazgos: project.hallazgos,
          dosier: project.dosier,
          rutaCritica: project.rutaCritica,
        
          factura: project.factura,
          pago: project.pago,
          utilidadProgramada: project.utilidadProgramada,
          utilidadReal: project.utilidadReal,
          financiamiento: project.financiamiento,
        
          cierreProyectoActaEntrega: project.cierreProyectoActaEntrega
        });
      }
    });
  }

  saveProject(): void {
    console.log("guardar proyecto", this.projectForm);
    if (this.projectForm.invalid) return;
  
    const projectData: any = this.projectForm.value;
    console.log("data de proyecto ", projectData);
  
    if (this.projectId) {
      // Actualizar proyecto
      projectData.proyectoId = this.projectId;
      this.projectService.updateProject(projectData).subscribe(() => {
        // Redirigir a la lista de proyectos
        this.router.navigate(['/dashboards/project']); // O la ruta correspondiente a la lista
      });
    } else {
      // Crear nuevo proyecto
      this.projectService.createProject(projectData).subscribe(() => {
        // Redirigir a la lista de proyectos
        this.router.navigate(['/dashboards/project']); // O la ruta correspondiente a la lista
      });
    }
  }
}