# Manual Test Cases for Employer Features

## A. Homepage Navigation Tests
1. **Employer Sign Up Button**
   - [ ] Verify "Employer Sign Up" button is visible on homepage
   - [ ] Click should navigate to employer registration page
   - [ ] Page should load without errors

2. **Candidate Sign Up Button**
   - [ ] Verify "Candidate Sign Up" button is visible
   - [ ] Should be clearly distinguished from Employer signup

## B. Employer Registration Flow
1. **Basic Information Entry**
   - [ ] Enter Company Name: "Test Company Inc"
   - [ ] Enter Email: "test@company.com"
   - [ ] Enter Password: "Test123!"
   - [ ] All fields should have proper validation
   - [ ] Form should not submit with empty fields

2. **Plan Selection**
   - [ ] Select Freemium Plan
   - [ ] Select Pro Plan
   - [ ] Select Premium Plan
   - [ ] Select Premium Plus Plan
   - [ ] Plan features should be clearly displayed
   - [ ] Selected plan should be highlighted

3. **Registration Completion**
   - [ ] Submit registration form
   - [ ] Should show success message
   - [ ] Should redirect to employer dashboard
   - [ ] Email verification should be sent

## C. Employer Dashboard Tests
1. **Navigation**
   - [ ] Left sidebar should be visible
   - [ ] "Find Intern" option should be prominent
   - [ ] Dashboard should be responsive on mobile

2. **Job Description Search**
   - [ ] Enter short job description (50 characters)
   - [ ] Enter long job description (500+ characters)
   - [ ] Test empty submission
   - [ ] Test special characters
   - [ ] Verify search button is disabled when empty

3. **Results Display**
   ### Freemium Plan
   - [ ] Should show maximum 1 result
   - [ ] "Upgrade Plan" prompt should be visible
   
   ### Pro Plan
   - [ ] Should show maximum 3 results
   - [ ] Results should be ordered by relevance
   
   ### Premium Plan
   - [ ] Should show maximum 5 results
   - [ ] Should include detailed intern information
   
   ### Premium Plus Plan
   - [ ] Should show up to 10 results
   - [ ] Should have advanced filtering options

4. **Intern Profile View**
   - [ ] Click on intern name shows full profile
   - [ ] Resume download link works
   - [ ] Skills are clearly displayed
   - [ ] Contact information is properly masked

5. **Candidate Selection**
   - [ ] "Select" button is functional
   - [ ] "Reject" button is functional
   - [ ] Confirmation dialog appears
   - [ ] Status updates immediately
   - [ ] Selected candidates appear in dashboard

## D. Plan Management Tests
1. **Plan Upgrade Flow**
   - [ ] Access plan upgrade section
   - [ ] View available plans
   - [ ] Select new plan
   - [ ] Confirm plan change
   - [ ] Verify new limits are applied

2. **Current Plan Display**
   - [ ] Current plan is clearly shown
   - [ ] Usage limits are displayed
   - [ ] Remaining searches shown
   - [ ] Upgrade prompts appear when near limit

## E. Error Handling Tests
1. **Network Issues**
   - [ ] Test search with no internet
   - [ ] Test profile view offline
   - [ ] Verify error messages are user-friendly

2. **Invalid Inputs**
   - [ ] Test SQL injection in search
   - [ ] Test XSS in job description
   - [ ] Test with invalid email formats
   - [ ] Test with weak passwords

## F. Mobile Responsiveness
1. **Small Screens (320px - 480px)**
   - [ ] Test registration form
   - [ ] Test dashboard layout
   - [ ] Test search results display
   - [ ] Test navigation menu

2. **Tablets (768px - 1024px)**
   - [ ] Test split view layout
   - [ ] Test search interface
   - [ ] Test results grid

## G. Browser Compatibility
Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Opera (latest)

## H. Performance Tests
1. **Load Times**
   - [ ] Dashboard initial load < 3s
   - [ ] Search results load < 2s
   - [ ] Profile view load < 1s

2. **Responsiveness**
   - [ ] UI remains responsive during search
   - [ ] No lag when switching views
   - [ ] Smooth transitions

## I. Data Verification
After each major action, verify in Supabase:
1. **Profile Creation**
```sql
SELECT * FROM intern_profiles 
WHERE email = 'test@company.com';
```

2. **Search History**
```sql
SELECT * FROM job_searches 
WHERE customer_id = '[TEST_ID]';
```

3. **Candidate Selections**
```sql
SELECT * FROM candidate_selections 
WHERE customer_id = '[TEST_ID]';
```

## Test Execution Checklist
- [ ] All critical paths tested
- [ ] Edge cases covered
- [ ] Error scenarios verified
- [ ] Mobile compatibility checked
- [ ] Browser compatibility verified
- [ ] Database integrity confirmed

## Bug Report Template
If you find issues, report them in this format:

```
Bug ID: [NUMBER]
Severity: [HIGH/MEDIUM/LOW]
Component: [COMPONENT NAME]
Description: [DETAILED DESCRIPTION]
Steps to Reproduce:
1. Step 1
2. Step 2
3. Step 3
Expected Result: [WHAT SHOULD HAPPEN]
Actual Result: [WHAT ACTUALLY HAPPENED]
Screenshots: [IF APPLICABLE]
Environment: [BROWSER/OS/DEVICE]
```

## Test Completion Criteria
- All critical features working
- No high-severity bugs
- Mobile responsiveness verified
- Cross-browser compatibility confirmed
- Database integrity maintained 