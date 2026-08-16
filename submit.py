import requests
import json
import os

url = "http://localhost:3000/api/submit" # Adjust port if needed

data = {
  "branch_name": "chore/split-medical-report",
  "commit_message": "chore: split MedicalReport.tsx into smaller components",
  "title": "🧹 [code health improvement] Refactor MedicalReport component into smaller section components",
  "description": "🧹 [code health improvement] Refactor MedicalReport component into smaller section components\n\n🎯 **What:**\nThe `MedicalReport.tsx` component was over 230 lines long and contained the rendering logic for every single section of the clinical report (Header, Accumulation Warnings, Contraindications, Polypharmacy, Food Interactions, Drug Interactions, and Disclaimer). This PR refactors it by extracting each distinct section into its own dedicated React component within a new `components/MedicalReportSections` directory.\n\n💡 **Why:**\nSplitting this massive component significantly improves readability and maintainability. By adhering to the Single Responsibility Principle, each section component now only cares about its specific data props. It makes `MedicalReport.tsx` act solely as an orchestrator, making the high-level structure of the report much easier to understand at a glance.\n\n✅ **Verification:**\n- Ran the full test suite (`npx jest`) to ensure the rendering logic remains exactly the same.\n- Verified that `MedicalReport.test.tsx` specifically passes, confirming that the conditional rendering of the extracted components works as expected when arrays are empty vs populated.\n- Ran linting to ensure no new errors were introduced.\n- Verified through code review that types and props were correctly migrated.\n\n✨ **Result:**\nThe `MedicalReport.tsx` file size has been reduced dramatically, and the codebase is now cleaner, more modular, and easier to modify in the future without risking unintended side effects in unrelated report sections."
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
