@ui @dashboard
Feature: TestMu AI Quality Dashboard Telemetry & Management
  As a QA engineer or manager
  I want to review test execution telemetry, filter test runs, and manage suites
  So that I have full visibility into software release quality

  Background:
    Given the user is authenticated with a valid session token
    And the user navigates to "/dashboard"

  @smoke @p0
  Scenario: Metric widgets load with accurate mathematical calculations
    Then the "Total Test Runs" widget displays "4"
    And the "Passing Rate" widget displays "50.0%"
    And the "Flaky Tests Detected" widget displays "12"
    And the "Avg Duration" widget displays "96s"
    And the values match the aggregated dataset from the test runs API

  @regression @p1
  Scenario Outline: Filter test runs by execution status
    When the user selects "<filterOption>" from the status filter dropdown
    Then only test runs with status "<filterOption>" should be visible in the table
    And the visible row count should be exactly "<expectedRowCount>"

    Examples:
      | filterOption | expectedRowCount |
      | passed       | 2                |
      | failed       | 1                |
      | running      | 1                |
      | all          | 4                |

  @regression @p1
  Scenario: Real-time search filters test runs across multiple columns
    When the user types "Billing" into the search input
    Then only test run "TR-102" is displayed in the table
    And runs matching other names are filtered out

  @regression @p2
  Scenario: Two-way column sorting on duration
    When the user clicks the "Duration (s)" column header
    Then the table rows should be ordered in ascending order of duration
    When the user clicks the "Duration (s)" column header again
    Then the table rows should be ordered in descending order of duration

  @rbac @security @p0
  Scenario: Permission-based visibility for Admin user
    Given the user is logged in as "admin@testmu.ai" with role "admin"
    When the dashboard loads
    Then the "+ New Test Run" button is visible
    And the "Actions" table column is visible with "Delete" buttons for each row

  @rbac @security @p0
  Scenario: Permission-based visibility restriction for Viewer user
    Given the user is logged in as "engineer@testmu.ai" with role "viewer"
    When the dashboard loads
    Then the "+ New Test Run" button MUST NOT be visible
    And the "Actions" table column and "Delete" buttons MUST NOT be present

  @responsive @p2
  Scenario: Responsive layout adapts to mobile viewport
    Given the browser viewport is set to 375x667 (mobile screen)
    When the dashboard is loaded
    Then the navigation sidebar should be hidden by default
    And the hamburger menu toggle button is visible
    When the user clicks the hamburger toggle
    Then the navigation sidebar expands into view
