import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-roadmap',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './roadmap.component.html',
    styleUrls: []
})
export class RoadmapComponent implements OnInit {

    constructor() { }

    ngOnInit(): void {
    }
}
