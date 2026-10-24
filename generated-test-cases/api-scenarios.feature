@api @rest
Feature: TestMu AI REST API Suite v1
  As an automation framework or CI/CD runner
  I want to interact with the TestMu AI REST endpoints
  So that I can programmatically trigger, inspect, and manage test runs

  Background:
    Given the REST API base URL is configured

  @auth @smoke @p0
  Scenario: Valid token authentication allows access to protected resources
    When a "GET" request is sent to "/api/v1/test-runs" with header "Authorization: Bearer valid-token-admin"
    Then the response status code should be 200
    And the response body should be an array of test runs

  @auth @security @p0
  Scenario Outline: Unauthorized access rejected with RFC 7807 problem details
    When a "GET" request is sent to "/api/v1/test-runs" with "<authHeader>"
    Then the response status code should be 401
    And the response body contains "type" equal to "https://testmu.ai/errors/unauthorized"
    And the response body contains "status" equal to 401

    Examples:
      | authHeader                              |
      | Missing Authorization header            |
      | Authorization: Bearer invalid-or-expired|
      | Authorization: Basic admin:pass         |

  @crud @p0
  Scenario: Full CRUD lifecycle for Test Run resource
    # 1. Create
    When a "POST" request is sent to "/api/v1/test-runs" with body:
      """
      {
        "name": "E2E Checkout Workflow",
        "suite": "Payments",
        "environment": "staging"
      }
      """
    Then the response status code should be 201
    And the response body contains "id" starting with "TR-"
    And the status is initialized to "running"

    # 2. Read single
    When a "GET" request is sent to "/api/v1/test-runs/{newId}"
    Then the response status code should be 200
    And the response body field "name" equals "E2E Checkout Workflow"

    # 3. Update
    When a "PUT" request is sent to "/api/v1/test-runs/{newId}" with body:
      """
      {
        "status": "passed",
        "durationSec": 88
      }
      """
    Then the response status code should be 200
    And the response body field "status" equals "passed"
    And the response body field "durationSec" equals 88

    # 4. Delete (Admin)
    When a "DELETE" request is sent to "/api/v1/test-runs/{newId}" with Admin token
    Then the response status code should be 204

  @schema @p1
  Scenario: Schema validation catches missing mandatory fields
    When a "POST" request is sent to "/api/v1/test-runs" with incomplete payload:
      """
      {
        "name": "Orphan Test Run"
      }
      """
    Then the response status code should be 400
    And the response body "type" equals "https://testmu.ai/errors/validation-error"
    And "invalidParams" lists missing fields "suite" and "environment"

  @rbac @security @p1
  Scenario: Non-admin user cannot delete test runs
    When a "DELETE" request is sent to "/api/v1/test-runs/TR-101" with Viewer token
    Then the response status code should be 403
    And the response body "detail" states "Only users with the Admin role are authorized to delete test runs."

  @rate-limiting @p1
  Scenario: Public rate limiting enforces 20 req/min threshold
    When 25 consecutive requests are sent to "/api/v1/rate-limit-test" in under 10 seconds
    Then request 21 through 25 should return HTTP 429
    And the response headers contain "X-RateLimit-Limit: 20"
    And the response headers contain "X-RateLimit-Remaining: 0"
    And the response headers contain "Retry-After"

  @resilience @p2
  Scenario: Chaos endpoint returns 500 Internal Server Error
    When a "GET" request is sent to "/api/v1/chaos/server-error"
    Then the response status code should be 500
    And the response body contains "title" equal to "Internal Server Error"
