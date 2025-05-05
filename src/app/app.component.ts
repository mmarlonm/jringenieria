import { Component,OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PresenceService } from './presence.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: true,
    imports: [RouterOutlet],
})
export class AppComponent implements OnInit {
  connectedUsers: string[] = [];
    /**
     * Constructor
     */
    constructor(private presenceService: PresenceService) {}

    ngOnInit(): void {
      const token = localStorage.getItem('accessToken'); // o donde tengas el id

      if (!token) return
      this.presenceService.startConnection(token);
  
      this.presenceService.connectedUsers$.subscribe(users => {
        this.connectedUsers = users;
        console.log('Usuarios conectados:', this.connectedUsers);
      });
    }
}
