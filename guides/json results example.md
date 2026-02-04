{
  "client_name": "Acme Corp",
  "testing_company_name": "CyberSecure Ltd.",
  "testing_start_date": "2026-01-10",
  "testing_end_date": "2026-01-20",
  "testing_duration": "10 days",
  "testing_mode": "Black-box",
  "revisioner_name": "Jane Doe",
  "revisioner_role": "Lead Security Analyst",
  "revisioner_date": "2026-01-25",
  "approver_name": "John Smith",
  "approver_date": "2026-01-27",
  "executive_summary": "This report provides the findings of the security assessment conducted on Acme Corp systems, detailing vulnerabilities, risks, and remediation measures.",

  "targets": [
    {
      "name": "Web Application",
      "url": "https://app.acme.com",
      "severity": "High"
    },
    {
      "name": "Internal API",
      "url": "https://api.acme.com",
      "severity": "Medium"
    }
  ],

  "credentials": [
    {
      "username": "admin_user",
      "description": "Admin account used for testing privileged access."
    },
    {
      "username": "guest_user",
      "description": "Low-privilege account used to test access restrictions."
    }
  ],

  "testers": [
    {
      "name": "Alice Johnson",
      "role": "Penetration Tester",
      "date": "2026-01-11"
    },
    {
      "name": "Bob Lee",
      "role": "Security Analyst",
      "date": "2026-01-12"
    }
  ],

  "vulnerabilities": [
    {
      "name": "SQL Injection",
      "severity": "Critical",
      "priority": "P1",
      "cvss_score": 9.8,
      "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
      "description": "The login form is vulnerable to SQL injection.",
      "impact": "An attacker could exfiltrate all user data from the database.",
      "endpoints": [
        {
          "index": 1,
          "http_method": "POST",
          "path": "/login",
          "parameter": "username"
        },
        {
          "index": 2,
          "http_method": "POST",
          "path": "/login",
          "parameter": "password"
        }
      ],
      "attacks": [
        { "type": "text", "text": "Payload ' OR '1'='1 was used to bypass authentication." },
        { "type": "text", "text": "Authentication bypass confirmed for admin account." },
        { "type": "image", "image": "sql_injection_screenshot1.png", "caption": "SQLi successful login bypass." },
        { "type": "image", "image": "sql_injection_screenshot2.png", "caption": "Database data exfiltrated." },
        { "type": "text", "text": "Additional database tables accessed using UNION query." },
        { "type": "image", "image": "sql_injection_screenshot3.png", "caption": "User data dumped from the database." }
      ],
      "remediation": "Use parameterized queries and input validation to prevent SQL injection."
    },
    {
      "name": "Cross-Site Scripting (XSS)",
      "severity": "High",
      "priority": "P2",
      "cvss_score": 7.5,
      "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:N",
      "description": "Reflected XSS vulnerability in search input.",
      "impact": "Attacker can execute scripts in the context of the victim's browser.",
      "endpoints": [
        {
          "index": 1,
          "http_method": "GET",
          "path": "/search",
          "parameter": "query"
        }
      ],
      "attacks": [
        { "type": "text", "text": "Injected <script>alert('XSS1')</script> and triggered alert." },
        { "type": "text", "text": "Injected <script>alert('XSS2')</script> for additional testing." },
        { "type": "image", "image": "xss_demo1.png", "caption": "Alert triggered in victim browser." },
        { "type": "image", "image": "xss_demo2.png", "caption": "XSS payload displayed in search results." }
      ],
      "remediation": "Sanitize user input and use Content Security Policy (CSP)."
    }
  ]
}
