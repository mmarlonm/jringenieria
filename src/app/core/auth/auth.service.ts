import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { AuthUtils } from "app/core/auth/auth.utils";
import { UserService } from "app/core/user/user.service";
import { environment } from "environments/environment"; // Asegúrate de tener la URL base de tu API aquí
import { Observable, of, switchMap, throwError } from "rxjs";
@Injectable({ providedIn: "root" })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/Auth`; // Asegúrate de que esto sea correcto
  private _authenticated: boolean = false;
  private _httpClient = inject(HttpClient);
  private _userService = inject(UserService);

  // -----------------------------------------------------------------------------------------------------
  // @ Accessors
  // -----------------------------------------------------------------------------------------------------

  /**
   * Setter & getter for access token
   */
  set accessToken(token: string) {
    localStorage.setItem("accessToken", token);
  }

  get accessToken(): string {
    return localStorage.getItem("accessToken") ?? "";
  }

  /**
   * Setter & getter for user information
   */
  set userInformation(usr: string) {
    localStorage.setItem("userInformation", usr);
  }

  get userInformation(): string {
    return localStorage.getItem("userInformation") ?? "";
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Forgot password
   *
   * @param email
   */
  forgotPassword(email: string): Observable<any> {
    return this._httpClient.post("api/auth/forgot-password", email);
  }

  /**
   * Reset password
   *
   * @param password
   */
  resetPassword(password: string): Observable<any> {
    return this._httpClient.post("api/auth/reset-password", password);
  }

  /**
   * Sign in
   *
   * @param credentials
   */
  signIn(credentials: { username: string; password: string }): Observable<any> {
    // Throw error, if the user is already logged in
    if (this._authenticated) {
      return throwError("User is already logged in.");
    }
    return this._httpClient.post(`${this.apiUrl}/login`, credentials).pipe(
      switchMap((response: any) => {
        // Store the access token in the local storage
        this.accessToken = response.token;
        // Set the authenticated flag to true
        this._authenticated = true;

        const { token, ...userWithoutToken } = response;
        this.userInformation = JSON.stringify(userWithoutToken);

        // Store the user on the user service
        this._userService.user = response;
        // Return a new observable with the response
        return of(response);
      })
    );
  }

  /**
   * Sign out
   */
  signOut(): Observable<any> {
    // Remove the access token from the local storage
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userInformation");
    // Set the authenticated flag to false
    this._authenticated = false;

    // Return the observable
    return of(true);
  }

  /**
   * Sign up
   *
   * @param user
   */
  signUp(user: {
    name: string;
    email: string;
    password: string;
    company: string;
  }): Observable<any> {
    return this._httpClient.post("api/auth/sign-up", user);
  }

  /**
   * Unlock session
   *
   * @param credentials
   */
  unlockSession(credentials: {
    email: string;
    password: string;
  }): Observable<any> {
    return this._httpClient.post("api/auth/unlock-session", credentials);
  }

  /**
   * Check the authentication status
   */
  check(): Observable<boolean> {
    // Check if the user is logged in
    if (this._authenticated) {
      return of(true);
    }

    // Check the access token availability
    if (!this.accessToken) {
      return of(false);
    }

    // Check the access token expire date
    if (AuthUtils.isTokenExpired(this.accessToken)) {
      return of(false);
    }
    const user: any = JSON.parse(this.userInformation);
    this._userService.user = user;
    // If the token is available and not expired, return true
    return of(true); // Token is valid, so the user is authenticated
  }
}
