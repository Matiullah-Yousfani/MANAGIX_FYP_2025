"""Quick validation tests for ai_planner.py"""
import json, sys
sys.path.insert(0, '.')
from ai_planner import validate_and_normalize_plan, ProjectPlanRequest, ProjectPlanResponse, build_prompt

# Test 1: Normal plan
plan = {
    'milestones': [
        {'title': 'Design', 'description': 'System design', 'deadlineOffsetDays': 14, 'budgetPercentage': 20, 'tasks': [{'title': 'Create wireframes', 'description': 'UI wireframes'}]},
        {'title': 'Backend', 'description': 'API dev', 'deadlineOffsetDays': 45, 'budgetPercentage': 40, 'tasks': [{'title': 'Build APIs', 'description': 'REST endpoints'}]},
        {'title': 'Frontend', 'description': 'UI dev', 'deadlineOffsetDays': 70, 'budgetPercentage': 30, 'tasks': [{'title': 'Build pages', 'description': 'React components'}]},
        {'title': 'Testing', 'description': 'QA', 'deadlineOffsetDays': 90, 'budgetPercentage': 10, 'tasks': [{'title': 'Run tests', 'description': 'Unit tests'}]}
    ]
}
result = validate_and_normalize_plan(plan)
total = sum(m['budgetPercentage'] for m in result['milestones'])
assert total == 100, f"Budget should be 100, got {total}"
print(f"[PASS] Test 1: Normal plan -> {len(result['milestones'])} milestones, budget={total}")

# Test 2: Budget doesn't sum to 100 - should normalize
plan2 = {
    'milestones': [
        {'title': 'A', 'description': '', 'deadlineOffsetDays': 10, 'budgetPercentage': 30, 'tasks': [{'title': 'T1', 'description': ''}]},
        {'title': 'B', 'description': '', 'deadlineOffsetDays': 20, 'budgetPercentage': 25, 'tasks': [{'title': 'T2', 'description': ''}]},
    ]
}
result2 = validate_and_normalize_plan(plan2)
total2 = sum(m['budgetPercentage'] for m in result2['milestones'])
assert abs(total2 - 100) < 0.1, f"Budget should normalize to 100, got {total2}"
print(f"[PASS] Test 2: Budget 55 -> normalized to {total2}")

# Test 3: Milestones out of order - should sort
plan3 = {
    'milestones': [
        {'title': 'Late', 'description': '', 'deadlineOffsetDays': 90, 'budgetPercentage': 50, 'tasks': [{'title': 'T1', 'description': ''}]},
        {'title': 'Early', 'description': '', 'deadlineOffsetDays': 10, 'budgetPercentage': 50, 'tasks': [{'title': 'T2', 'description': ''}]},
    ]
}
result3 = validate_and_normalize_plan(plan3)
assert result3['milestones'][0]['title'] == 'Early', "Should sort by deadlineOffsetDays"
print(f"[PASS] Test 3: Sort order -> first milestone is '{result3['milestones'][0]['title']}'")

# Test 4: Missing fields - should handle gracefully
plan4 = {
    'milestones': [
        {'title': 'X', 'tasks': [{'title': 'Do something'}]},
    ]
}
result4 = validate_and_normalize_plan(plan4)
assert result4['milestones'][0]['deadlineOffsetDays'] == 14
assert result4['milestones'][0]['budgetPercentage'] == 100.0
print(f"[PASS] Test 4: Missing fields -> defaults applied correctly")

# Test 5: Pydantic models work
req = ProjectPlanRequest(projectName="Test", projectDescription="Build something", deadline="30 days", budget=10000)
assert req.projectName == "Test"
print(f"[PASS] Test 5: Pydantic request model works")

resp = ProjectPlanResponse(**result)
assert len(resp.milestones) == 4
print(f"[PASS] Test 6: Pydantic response model works")

# Test 7: Prompt builder
prompt = build_prompt("My Project", "Build a web app", "90 days", 50000)
assert "My Project" in prompt
assert "50000" in prompt
assert "milestones" in prompt
print(f"[PASS] Test 7: Prompt builder includes all inputs")

print("\n=== ALL 7 TESTS PASSED ===")
