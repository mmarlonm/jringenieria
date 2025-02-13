import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectService } from '../project.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-project-list',
  templateUrl: './project-list.component.html',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule
  ]
})
export class ProjectListComponent implements OnInit {
  displayedColumns: string[] = ['id', 'name', 'category', 'startDate', 'endDate', 'actions'];
  dataSource = new MatTableDataSource<any>();
  projectsCount: number = 0;
  searchText: string = '';

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private projectService: ProjectService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.getProjects();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  getProjects(): void {
    this.projectService.getProjects().subscribe((projects) => {
      this.projectsCount = projects.length;
      this.dataSource = new MatTableDataSource(projects);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    });
  }

  /**
   * Aplica el filtro de búsqueda en la tabla.
   */
  applyFilter(e): void {
    this.dataSource.filter = e.target.value.trim().toLowerCase();
  }

  addProject(): void {
    this.router.navigate(['/dashboards/project/new']);
  }

  editProject(projectId: number): void {
    this.router.navigate([`/dashboards/project/${projectId}`]);
  }

  deleteProject(projectId: number): void {
    this.projectService.deleteProject(projectId).subscribe(() => {
      this.getProjects();
      this.snackBar.open('Proyecto eliminado correctamente', 'Cerrar', { duration: 3000 });
    });
  }
}