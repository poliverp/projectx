// src/pages/CreateCasePage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api'; // Adjust path if needed

function CreateCasePage() {
    const navigate = useNavigate();

    // State for form fields - matches backend Case model attributes
    const [displayName, setDisplayName] = useState('');
    const [officialCaseName, setOfficialCaseName] = useState('');
    const [caseNumber, setCaseNumber] = useState('');
    const [judge, setJudge] = useState('');
    const [plaintiff, setPlaintiff] = useState('');
    const [defendant, setDefendant] = useState('');
    // We might add a state for case_details later if needed, or handle it differently

    // State for loading and errors during submission
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Replace the existing handleSubmit placeholder with this:
    const handleSubmit = async (event) => {
        event.preventDefault(); // Prevent default page reload on form submission
        setLoading(true);
        setError(null);

        // --- 1. Basic Client-Side Validation ---
        // Check if required fields (like display_name) are filled
        if (!displayName.trim()) {
            setError("Display Name is required.");
            setLoading(false);
            return; // Stop submission if validation fails
        }

        // --- 2. Construct Data Payload ---
        // Create the object to send to the API.
        // Keys MUST match what the backend API/service expects (e.g., display_name, not displayName).
        const caseData = {
            display_name: displayName.trim(),
            // Use .trim() and send null if the string is empty after trimming,
            // as the backend columns are nullable. Avoid sending empty strings ""
            // if the backend expects null for empty optional fields.
            official_case_name: officialCaseName.trim() || null,
            case_number: caseNumber.trim() || null,
            judge: judge.trim() || null,
            plaintiff: plaintiff.trim() || null,
            defendant: defendant.trim() || null,
            // Initialize case_details as an empty object if your backend expects it,
            // otherwise omit it or set to null if appropriate.
            // case_details: {}
        };

        console.log("Submitting New Case Data:", caseData); // For debugging

        // --- 3. Call API ---
        try {
            const response = await api.createCase(caseData); // Call the API function
            console.log("Case created successfully:", response.data);

            // --- 4. Handle Success ---
            // Assuming the backend returns the newly created case object with its 'id'
            const newCaseId = response.data?.id;

            if (newCaseId) {
                // Navigate to the newly created case's detail page
                navigate(`/case/${newCaseId}`);
            } else {
                // Fallback if ID is missing in response - navigate back to the list
                console.warn("New case ID not found in backend response, navigating to list.");
                alert("Case created successfully!"); // Provide feedback
                navigate('/manage-cases');
            }

        } catch (err) {
            // --- 5. Handle Errors ---
            console.error("Error creating case:", err);
            // Try to get a specific error message from the backend response
            const backendError = err.response?.data?.error || 'An unknown error occurred.';
            let displayError = `Failed to create case: ${backendError}`;

            // Provide more specific feedback for known errors (like duplicate name)
            if (err.response?.status === 409) { // 409 Conflict status code
                 displayError = `Failed to create case: ${backendError}. Please use a unique Display Name.`;
            }
            setError(displayError);

        } finally {
            // --- 6. Reset Loading State ---
            setLoading(false); // Ensure loading indicator is turned off
        }
    };

    return (
        <div>
            <h1>Create New Case</h1>
            {error && <p className="error-message" style={{ color: 'red' }}>Error: {error}</p>}

            {/* We will add the <form> and input fields here in the next step */}
            <form onSubmit={handleSubmit}>
                {/* Display Name (Required) */}
                <div style={{ marginBottom: '15px', textAlign: 'left' }}>
                    <label htmlFor="displayName" style={{ display: 'block', marginBottom: '5px' }}>Display Name:*</label>
                    <input
                        type="text"
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required // Mark as required in the form
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>

                {/* Official Case Name */}
                <div style={{ marginBottom: '15px', textAlign: 'left' }}>
                    <label htmlFor="officialCaseName" style={{ display: 'block', marginBottom: '5px' }}>Official Case Name:</label>
                    <input
                        type="text"
                        id="officialCaseName"
                        value={officialCaseName}
                        onChange={(e) => setOfficialCaseName(e.target.value)}
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>

                {/* Case Number */}
                <div style={{ marginBottom: '15px', textAlign: 'left' }}>
                    <label htmlFor="caseNumber" style={{ display: 'block', marginBottom: '5px' }}>Case Number:</label>
                    <input
                        type="text"
                        id="caseNumber"
                        value={caseNumber}
                        onChange={(e) => setCaseNumber(e.target.value)}
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>

                {/* Judge */}
                <div style={{ marginBottom: '15px', textAlign: 'left' }}>
                    <label htmlFor="judge" style={{ display: 'block', marginBottom: '5px' }}>Judge:</label>
                    <input
                        type="text"
                        id="judge"
                        value={judge}
                        onChange={(e) => setJudge(e.target.value)}
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>

                {/* Plaintiff */}
                <div style={{ marginBottom: '15px', textAlign: 'left' }}>
                    <label htmlFor="plaintiff" style={{ display: 'block', marginBottom: '5px' }}>Plaintiff:</label>
                    <input
                        type="text"
                        id="plaintiff"
                        value={plaintiff}
                        onChange={(e) => setPlaintiff(e.target.value)}
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>

                {/* Defendant */}
                <div style={{ marginBottom: '15px', textAlign: 'left' }}>
                    <label htmlFor="defendant" style={{ display: 'block', marginBottom: '5px' }}>Defendant:</label>
                    <input
                        type="text"
                        id="defendant"
                        value={defendant}
                        onChange={(e) => setDefendant(e.target.value)}
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>

                {/* --- Add other fields if necessary --- */}

                {/* Submit Button (already exists) */}
                <button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Case'}
                </button>
                <Link to="/manage-cases" style={{ marginLeft: '10px' }}>Cancel</Link>

                {/* --- End of form fields --- */}

                <button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Case'}
                </button>
                <Link to="/manage-cases" style={{ marginLeft: '10px' }}>Cancel</Link>
            </form>

        </div>
    );
}

export default CreateCasePage;