var express = require('express');
var router = express.Router();
const { db } = require('../config/database');
const DatabaseAbstraction = require('../config/db-abstraction');

const dbAbstraction = new DatabaseAbstraction(db);

router.get('/', function(req, res, next) {
  res.json({ 
    message: "Welcome to the Survey Profiling API",
    status: "Online" 
  });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  console.log('Login request received:', { username: username, passwordProvided: !!password });
  
  if (!username || !password) {
    console.log('Missing username or password');
    return res.status(400).json({ message: "Username and password are required" });
  }
  
  try {
    const user = await dbAbstraction.getUserByUsername(username);
    console.log('Database query result:', user);

    if (!user) {
      console.log('User not found:', username);
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    console.log('Stored password:', user.password);
    console.log('Provided password:', password);
    console.log('Password match:', user.password === password);

    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    res.status(200).json({ message: 'Login successful', user: { username: user.username } });
  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// FIXED: Submit Survey Route - Matching actual database schema
router.post('/submit-survey', async (req, res) => {
  if (!req.body || !req.body.data) {
    return res.status(400).json({ error: "Invalid request data" });
  }
  
  let { general, primary, health, socio } = req.body.data;
  
  // Helper to convert undefined/empty to null
  const fix = (v) => (v === undefined || v === '' ? null : v);
  
  // Helper to get value by frontend key, return null if missing
  const val = (obj, key) => {
    if (!obj || !obj[key]) return null;
    return fix(obj[key]);
  };
  
  try {
    console.log('Received general data:', general);
    console.log('Received primary data:', primary);
    console.log('Primary m_role:', primary?.m_role);
    console.log('Primary m_name:', primary?.m_name);
    console.log('Received health data:', health);
    console.log('Received socio data:', socio);

    const result = await dbAbstraction.withTransaction(async () => {

    // 1. Insert into 'households' table - matching actual DB columns
    const householdData = {
      purok_gimong: val(general, 'purokGimong'),
      barangay_name: val(general, 'barangayName'),
      municipality: val(general, 'municipality-select') || val(general, 'municipalityName'),
      province: val(general, 'provinceName'),
      mode_of_transportation: val(general, 'modeOfTransportation'),
      road_structure: val(general, 'road_Structure'),
      urban_rural_classification: val(general, 'urban_ruralClassification'),
      parish_name: val(general, 'nameOfParish'),
      diocese_prelature: val(general, 'diocesePrelatureName'),
      years_residency: val(general, 'yrOfResInTheCommunity'),
      num_family_members: val(general, 'numOfFamMembers'),
      family_structure: val(general, 'familyStructure'),
      local_dialect: val(general, 'lclDialect'),
      ethnicity: val(general, 'ethnicity'),
      missionary_companion: val(socio, 'missionary_companion'),
      date_of_listing: val(socio, 'listing_date')
    };

    const householdId = await dbAbstraction.createHousehold(householdData);
    console.log('Household inserted with ID:', householdId);

    // 2. Insert parents profile into 'family_members' table
    // Insert Household Head
    if (primary?.head_name) {
      const headData = {
        household_id: householdId,
        role: '1',
        full_name: val(primary, 'head_name'),
        type_of_marriage: val(primary, 'head_marriage'),
        religion_code: val(primary, 'head_religion'),
        sex_code: val(primary, 'head_sex'),
        age: val(primary, 'head_age'),
        highest_educ_attainment: val(primary, 'head_educ'),
        occupation: val(primary, 'head_job'),
        status_of_work_code: val(primary, 'head_work_status')
      };
      await dbAbstraction.createFamilyMember(headData);
    }

    // Insert Spouse
    if (primary?.spouse_name) {
      const spouseData = {
        household_id: householdId,
        role: '2',
        full_name: val(primary, 'spouse_name') || '',
        type_of_marriage: val(primary, 'spouse_marriage') || '',
        religion_code: val(primary, 'spouse_religion') || '',
        sex_code: val(primary, 'spouse_sex') || '',
        age: val(primary, 'spouse_age') || '',
        highest_educ_attainment: val(primary, 'spouse_educ') || '',
        occupation: val(primary, 'spouse_job') || '',
        status_of_work_code: val(primary, 'spouse_work_status') || ''
      };
      await dbAbstraction.createFamilyMember(spouseData);
    }

    // 3. Insert other household members
    if (primary?.m_name && Array.isArray(primary.m_name) && primary.m_name.length > 0) {
      console.log('Processing family members array, length:', primary.m_name.length);
      for (let i = 0; i < primary.m_name.length; i++) {
        if (primary.m_name[i]) {
          console.log(`Inserting family member ${i}:`, {
            role: primary.m_role?.[i],
            full_name: primary.m_name[i],
            relation: primary.m_relation?.[i]
          });
          const memberData = {
            household_id: householdId,
            role: primary.m_role?.[i] || '3',
            full_name: primary.m_name[i],
            relation_to_head_code: primary.m_relation[i],
            sex_code: primary.m_sex[i],
            age: primary.m_age[i],
            civil_status_code: primary.m_civil[i],
            religion_code: primary.m_religion[i],
            sacraments_code: primary.m_sacraments[i],
            is_studying: primary.m_studying[i],
            highest_educ_attainment: primary.m_educ[i],
            occupation: primary.m_job[i],
            status_of_work_code: primary.m_work_status[i],
            fully_immunized_child: primary.m_immunized[i]
          };
          console.log('Member data to insert:', memberData);
          await dbAbstraction.createFamilyMember(memberData);
        }
      }
      console.log(`Inserted ${primary.m_name.length} family members`);
    }

    // 4. Insert into 'health_conditions' - matching actual DB columns
    const healthData = {
      household_id: householdId,
      common_illness_codes: val(health, 'common_illness'),
      treatment_source_code: val(health, 'treatment_source'),
      potable_water_source_code: val(health, 'water_source'),
      lighting_source_code: val(health, 'lighting_source'),
      cooking_source_code: val(health, 'cooking_source'),
      garbage_disposal_code: val(health, 'garbage_disposal'),
      toilet_facility_code: val(health, 'toilet_type'),
      water_to_toilet_distance_code: val(health, 'toilet_distance')
    };
    await dbAbstraction.createHealthConditions(healthData);
    console.log('Health conditions inserted');

    // 5. Insert into 'socio_economic' - matching actual DB columns
    const socioData = {
      household_id: householdId,
      income_monthly_code: val(socio, 'income_monthly'),
      expenses_weekly_code: val(socio, 'expenses_weekly'),
      has_savings: val(socio, 'has_savings'),
      savings_location_code: val(socio, 'savings_location'),
      house_lot_ownership_code: val(socio, 'house_ownership'),
      house_classification_code: val(socio, 'house_classification'),
      land_area_hectares: val(socio, 'land_area'),
      dist_from_church_code: val(socio, 'distance_church'),
      dist_from_market_code: val(socio, 'distance_market')
    };
    await dbAbstraction.createSocioEconomic(socioData);
    console.log('Socio-economic data inserted');

    return householdId;

    });

    console.log('Transaction committed successfully');
    
    res.status(200).json({ 
      success: true, 
      message: "Survey data saved successfully", 
      id: result 
    });

  } catch (err) {
    console.error("Database Error Details: ", err);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    
    res.status(500).json({ 
      error: err.message || "Internal Server Error",
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Test route first
router.get('/test', (req, res) => {
  res.json({ message: "Backend is working!", timestamp: new Date().toISOString() });
});

router.get('/search-participants', async (req, res) => {
  const { q } = req.query;
  
  console.log(`Search query: ${q} by user: ${req.userParish} (${req.userRole})`);
  
  if (!q || q.length < 2) {
    return res.json([]);
  }
  
    try {
    const results = await dbAbstraction.searchParticipants(q, req.userRole, req.userParish);
    console.log('Search results:', results.length, 'items');
    res.json(results);
  } catch (err) {
    console.error("Search Error:", err.message);
    res.status(500).json({ error: "Search failed", details: err.message });
  }
});

router.get('/participant/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid participant ID" });
  }
  
  try {
    // First, find the household_id from family_members using the member_id
    const member = await dbAbstraction.getMemberById(id);
    
    if (!member) {
      return res.status(404).json({ error: "Participant not found" });
    }
    
    const householdId = member.household_id;
    console.log(`Found member_id=${id} belongs to household_id=${householdId}`);
    
    // Get household information
    const household = await dbAbstraction.getHousehold(householdId);
    
    if (!household) {
      return res.status(404).json({ error: "Household not found" });
    }
    
    // Check if parish user has access to this household
    if (req.userRole !== 'archdiocese' && req.userParish) {
      if (household.parish_name !== req.userParish) {
        console.log(`Access denied: User ${req.userParish} cannot access household from parish ${household.parish_name}`);
        return res.status(403).json({ error: "Access denied: You can only view data from your own parish" });
      }
    }
    
    // Get all family members for this household
    const family_members = await dbAbstraction.getFamilyMembersByHousehold(householdId);
    
    // Get health conditions
    const health_conditions = await dbAbstraction.getHealthConditions(householdId);
    
    // Get socio-economic data
    const socio_economic = await dbAbstraction.getSocioEconomic(householdId);
    
    res.json({
      household: household || {},
      family_members: family_members || [],
      health_conditions: health_conditions || {},
      socio_economic: socio_economic || {},
      userRole: req.userRole,
      userParish: req.userParish
    });
    
  } catch (err) {
    console.error("Participant Details Error:", err);
    res.status(500).json({ error: "Failed to retrieve participant details" });
  }
});

router.get('/parishes', async (req, res) => {
  try {
    const parishes = await dbAbstraction.getAllParishes();
    res.json(parishes);
  } catch (err) {
    console.error("Get Parishes Error:", err);
    res.status(500).json({ error: "Failed to fetch parishes" });
  }
});

module.exports = router;