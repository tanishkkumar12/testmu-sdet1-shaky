@auth @login
Feature: TestMu AI Authentication & Session Management
  As a registered user of TestMu AI
  I want to securely log into the platform
  So that I can access test management capabilities according to my permissions

  Background:
    Given the TestMu AI application is available at the base URL
    And the user is on the "/login" page

  @smoke @p0
  Scenario Outline: Successful login with valid credentials
    When the user enters email "<email>" and password "<password>"
    And clicks the sign in button
    Then the user should be redirected to the "/dashboard" page
    And the user session token should be stored securely in localStorage
    And the header displays the email "<email>" and role "<role>"

    Examples:
      | email               | password         | role   |
      | admin@testmu.ai     | AdminPass123!    | admin  |
      | engineer@testmu.ai  | EngineerPass123! | viewer |

  @regression @p1
  Scenario Outline: Failed login with invalid or malformed credentials
    When the user enters email "<email>" and password "<password>"
    And clicks the sign in button
    Then an alert message containing "<expectedError>" should be displayed
    And the user remains on the "/login" page
    And no authentication token is set in storage

    Examples:
      | email               | password         | expectedError             |
      | admin@testmu.ai     | WrongPassword99  | Invalid email or password |
      | unknown@random.io   | RandomPass123!   | Invalid email or password |
      | not-an-email        | SomePass123!     | Invalid email or password |

  @security @p1
  Scenario: Forgot password workflow prevents email enumeration
    Given the user navigates to "/forgot-password"
    When the user submits a password reset request for "unregistered-user@company.com"
    Then a success message "If an account exists with this email, password recovery instructions have been sent." is displayed
    And the response does not indicate whether the email exists in the database

  @security @p0
  Scenario: Brute-force lockout triggers after 5 consecutive failures
    Given the account "admin@testmu.ai" has 0 failed attempts
    When the user attempts to log in with "admin@testmu.ai" and "WrongPass1" 5 times consecutively
    Then the 5th attempt returns HTTP 401 or 429
    And the error message states "Account is temporarily locked due to multiple failed login attempts. Try again in 15 minutes."
    And subsequent attempts with the correct password "AdminPass123!" are rejected until the cooldown expires

  @session @p1
  Scenario: Session expiry and unauthorized protected route redirect
    Given the user had a session token that has expired or been revoked
    When the user attempts to navigate directly to "/dashboard" without a valid token
    Then the user is immediately redirected to "/login"
    And access to dashboard telemetry data is blocked
