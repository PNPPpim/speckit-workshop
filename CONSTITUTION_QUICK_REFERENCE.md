# SpecKit Workshop Constitution - Quick Reference

## The Four Pillars

```
┌──────────────────────────────────────────────────────────────────────┐
│            SPECKIT WORKSHOP CONSTITUTION v1.0.0                      │
│                    Ratified: 2568-11-17                              │
└──────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │   PRINCIPLE I       │  │   PRINCIPLE II   │  │   PRINCIPLE III  │
    │  Code Quality       │  │ Testing          │  │ UX Consistency   │
    │  Excellence         │  │ Standards        │  │                  │
    ├─────────────────────┤  ├──────────────────┤  ├──────────────────┤
    │ ✓ Linting rules     │  │ ✓ 80% coverage   │  │ ✓ Design patterns│
    │ ✓ Complexity ≤ 10   │  │ ✓ Test-First     │  │ ✓ Clear errors   │
    │ ✓ No duplication    │  │ ✓ Unit tests     │  │ ✓ Consistent     │
    │ ✓ Naming standards  │  │ ✓ Integration    │  │   terminology    │
    │ ✓ Comments          │  │ ✓ Contract tests │  │ ✓ Unified schemas│
    │ ✓ SRP functions     │  │ ✓ Edge cases     │  │ ✓ End-to-end UAT │
    │                     │  │ ✓ No flaky tests │  │ ✓ Design system  │
    └─────────────────────┘  └──────────────────┘  └──────────────────┘
                  │                    │                      │
         Reduces defects     Early detection      Fewer support
         Faster onboarding   Living docs          Satisfied users
                  
    ┌──────────────────────────────────────────────────────────────────┐
    │              PRINCIPLE IV: Performance                            │
    │                   Requirements                                    │
    ├──────────────────────────────────────────────────────────────────┤
    │ ✓ Explicit SLA targets        ✓ Memory monitoring                 │
    │ ✓ Performance benchmarks      ✓ Cache strategies                  │
    │ ✓ Code profiling              ✓ Trade-off documentation           │
    │ ✓ Continuous monitoring       ✓ Quarterly reviews                 │
    └──────────────────────────────────────────────────────────────────┘
         Predictable performance  |  Scale capability  |  User confidence
```

## Enforcement Mechanisms

### Code Quality Standards
```
┌─────────────────────────────────────────────────────┐
│ Pre-commit Hooks → Linting & Formatting             │
│ Static Analysis → Bug & Security Detection          │
│ Code Review Checklist → Manual Verification         │
│ 10-15% Sprint Budget → Technical Debt Reduction     │
└─────────────────────────────────────────────────────┘
```

### Testing Infrastructure
```
┌─────────────────────────────────────────────────────┐
│ Centralized Test Runner → All test types executed   │
│ Coverage Tracking → Visible to all developers       │
│ Shared Fixtures → Consistent test data              │
│ Performance Benchmarks → Regressions caught         │
│ Test Review → Intent verification on every test     │
└─────────────────────────────────────────────────────┘
```

### Performance Monitoring
```
┌─────────────────────────────────────────────────────┐
│ Structured Logging → Latency, errors, resources    │
│ Alerting @ 80% SLA → Proactive intervention        │
│ Quarterly Profiling → Emerging bottleneck detection │
│ PR Impact Assessment → Performance-critical review  │
│ Public Dashboard → Team accountability              │
└─────────────────────────────────────────────────────┘
```

## Template Integration

### Plan Template
```
Constitution Check Gate (Before Phase 0)
├─ I. Code Quality: Linting strategy, complexity limits
├─ II. Testing: Unit, integration, contract test strategy
├─ III. UX: Design pattern alignment, error messaging
└─ IV. Performance: SLA targets, benchmark definition
```

### Spec Template
```
New Requirement Sections
├─ Quality Requirements (QR-001 to QR-004)
├─ Testing Requirements (TR-001 to TR-006)
├─ User Experience Requirements (UX-001 to UX-005)
├─ Performance Requirements (PR-001 to PR-005)
└─ Quality Success Criteria (QSC-001 to QSC-004)
```

### Tasks Template
```
Phase 2: Foundation Quality Infrastructure
├─ T009a: Linting & formatting setup
├─ T009b: Test framework & coverage setup
├─ T009c: Performance monitoring infrastructure
└─ T009d: Design system & UX standards

Per User Story: Quality Gates + Tests + Validation
├─ Quality Gates: Linting setup, performance targets, UX standards
├─ Tests: Contract, unit, integration, edge-case, performance (test-first)
├─ Implementation: Code with logging & error handling
└─ Validation: Coverage, benchmarks, UAT, code review
```

## Governance

| Aspect | Policy |
|--------|--------|
| **Amendments** | GitHub issue + maintainer consensus required |
| **Versioning** | MAJOR (breaking), MINOR (expanded), PATCH (clarification) |
| **Compliance** | PRs reference principles; violations flagged and justified |
| **Authority** | Constitution supersedes all other practices |
| **Reviews** | Quarterly adherence review with metrics published |
| **Escalation** | Contradictions escalated to project leads |

## Version & Dates

| Field | Value |
|-------|-------|
| **Version** | 1.0.0 |
| **Ratified** | 2568-11-17 |
| **Last Amended** | 2568-11-17 |
| **Type** | Initial Constitution |

---

## Key Metrics

### Code Quality Targets
- Cyclomatic Complexity: **≤ 10 per function**
- Code Coverage: **≥ 80%** for public APIs and core logic
- Duplication: **Zero tolerance**
- Linting Violations: **Zero waivers**

### Testing Requirements
- Test-First Approach: **Mandatory**
- Test Types: **Unit, Integration, Contract, Edge-case, Performance**
- Flaky Tests: **Zero tolerance**
- Coverage Tracking: **Visible to all developers**

### Performance Standards
- SLA Monitoring: **Continuous**
- Alert Threshold: **80% of SLA**
- Profiling Frequency: **At least quarterly**
- Memory Leaks: **Unacceptable**

### User Experience
- Error Message Clarity: **Actionable + Remediation guidance**
- Design Consistency: **All interfaces standardized**
- UAT Requirement: **Mandatory end-to-end testing**

---

For full details, see `.specify/memory/constitution.md`
