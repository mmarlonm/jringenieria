import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectService } from '../project.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
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
  projectId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private route: ActivatedRoute,
    public router: Router
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
        estado: ['NA']
      });

    this.getCategorias();
    this.getUnidadesDeNegocio();

    this.route.paramMap.subscribe(params => {
        const id = params.get('id');
        if (id === 'new') {
            this.projectId = null; // Se trata de un nuevo proyecto
        } else {
            this.projectId = Number(id);
            this.loadProject(this.projectId);
        }
    });
  }

  getCategorias(): void {
    this.projectService.getCategorias().subscribe(data => this.categorias = data);
  }

  getUnidadesDeNegocio(): void {
    this.projectService.getUnidadesDeNegocio().subscribe(data => this.unidadesDeNegocio = data);
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
          estado: project.estado
        });
      }
    });
  }

  saveProject(): void {
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