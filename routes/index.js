var express = require('express');
var router = express.Router();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'lein2324!', 
  database: 'user_db',
});

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
    const [users] = await pool.execute(
      'SELECT * FROM `users` WHERE `username` = ?', 
      [username]
    );

    console.log('Database query result:', users);

    if (users.length === 0) {
      console.log('User not found:', username);
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    console.log('Stored password:', users[0].password);
    console.log('Provided password:', password);
    console.log('Password match:', users[0].password === password);

    if (users[0].password !== password) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    res.status(200).json({ message: 'Login successful', user: { username: users[0].username } });
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
  
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    console.log('Received general data:', general);
    console.log('Received primary data:', primary);
    console.log('Received health data:', health);
    console.log('Received socio data:', socio);

    // 1. Insert into 'households' table - matching actual DB columns
    const [householdResult] = await connection.execute(
      `INSERT INTO households (
        purok_gimong, barangay_name, municipality, province, mode_of_transportation, 
        road_structure, urban_rural_classification, parish_name, diocese_prelature, years_residency, 
        num_family_members, family_structure, local_dialect, ethnicity,
        missionary_companion, date_of_listing
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        val(general, 'purokGimong'),
        val(general, 'barangayName'),
        val(general, 'municipality-select') || val(general, 'municipalityName'),
        val(general, 'provinceName'),
        val(general, 'modeOfTransportation'),
        val(general, 'road_Structure'),
        val(general, 'urban_ruralClassification'),
        val(general, 'nameOfParish'),
        val(general, 'diocesePrelatureName'),
        val(general, 'yrOfResInTheCommunity'),
        val(general, 'numOfFamMembers'),
        val(general, 'familyStructure'),
        val(general, 'lclDialect'),
        val(general, 'ethnicity'),
        val(socio, 'missionary_companion'),
        val(socio, 'listing_date')
      ]
    );

    const householdId = householdResult.insertId;
    console.log('Household inserted with ID:', householdId);

    // 2. Insert parents profile into 'family_members' table
    // Insert Household Head
    if (primary?.head_name) {
      await connection.execute(
        `INSERT INTO family_members (
          household_id, full_name, type_of_marriage, religion_code, sex_code, age,
          highest_educ_attainment, occupation, status_of_work_code
        ) VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          householdId,
          val(primary, 'head_name'),
          val(primary, 'head_marriage'),
          val(primary, 'head_religion'),
          val(primary, 'head_sex'),
          val(primary, 'head_age'),
          val(primary, 'head_educ'),
          val(primary, 'head_job'),
          val(primary, 'head_work_status')
        ]
      );
    }

    // Insert Spouse
    if (primary?.spouse_name) {
      await connection.execute(
        `INSERT INTO family_members (
          household_id, full_name, type_of_marriage, religion_code, sex_code, age,
          highest_educ_attainment, occupation, status_of_work_code
        ) VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          householdId,
          val(primary, 'spouse_name'),
          val(primary, 'spouse_marriage'),
          val(primary, 'spouse_religion'),
          val(primary, 'spouse_sex'),
          val(primary, 'spouse_age'),
          val(primary, 'spouse_educ'),
          val(primary, 'spouse_job'),
          val(primary, 'spouse_work_status')
        ]
      );
    }

    // 3. Insert other household members
    if (primary?.m_name && Array.isArray(primary.m_name) && primary.m_name.length > 0) {
      const memberQuery = `INSERT INTO family_members (
        household_id, full_name, relation_to_head_code, sex_code, age, civil_status_code, 
        religion_code, sacraments_code, is_studying, highest_educ_attainment, 
        occupation, status_of_work_code, fully_immunized_child
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`;

      for (let i = 0; i < primary.m_name.length; i++) {
        if (primary.m_name[i]) { // Only insert if name exists
          await connection.execute(memberQuery, [
            householdId,
            fix(primary.m_name[i]),
            fix(primary.m_relation[i]),
            fix(primary.m_sex[i]),
            fix(primary.m_age[i]),
            fix(primary.m_civil[i]),
            fix(primary.m_religion[i]),
            fix(primary.m_sacraments[i]),
            fix(primary.m_studying[i]),
            fix(primary.m_educ[i]),
            fix(primary.m_job[i]),
            fix(primary.m_work_status[i]),
            fix(primary.m_immunized[i])
          ]);
        }
      }
      console.log(`Inserted ${primary.m_name.length} family members`);
    }

    // 4. Insert into 'health_conditions' - matching actual DB columns
    await connection.execute(
      `INSERT INTO health_conditions (
        household_id, common_illness_codes, treatment_source_code, potable_water_source_code, 
        lighting_source_code, cooking_source_code, garbage_disposal_code, 
        toilet_facility_code, water_to_toilet_distance_code
      ) VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        householdId,
        val(health, 'common_illness'),
        val(health, 'treatment_source'),
        val(health, 'water_source'),
        val(health, 'lighting_source'),
        val(health, 'cooking_source'),
        val(health, 'garbage_disposal'),
        val(health, 'toilet_type'),
        val(health, 'toilet_distance')
      ]
    );
    console.log('Health conditions inserted');

    // 5. Insert into 'socio_economic' - matching actual DB columns
    await connection.execute(
      `INSERT INTO socio_economic (
        household_id, income_monthly_code, expenses_weekly_code, has_savings, savings_location_code,
        house_lot_ownership_code, house_classification_code, land_area_hectares,
        dist_from_church_code, dist_from_market_code
      ) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        householdId,
        val(socio, 'income_monthly'),
        val(socio, 'expenses_weekly'),
        val(socio, 'has_savings'),
        val(socio, 'savings_location'),
        val(socio, 'house_ownership'),
        val(socio, 'house_classification'),
        val(socio, 'land_area'),
        val(socio, 'distance_church'),
        val(socio, 'distance_market')
      ]
    );
    console.log('Socio-economic data inserted');

    await connection.commit();
    console.log('Transaction committed successfully');
    
    res.status(200).json({ 
      success: true, 
      message: "Survey data saved successfully", 
      id: householdId 
    });

  } catch (err) {
    await connection.rollback();
    console.error("Database Error Details: ", err);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    
    res.status(500).json({ 
      error: err.message || "Internal Server Error",
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } finally {
    connection.release();
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
    let whereClause = `WHERE fm.full_name LIKE ?`;
    let queryParams = [`%${q}%`];
    
    // If not Archdiocese, filter by parish
    if (req.userRole !== 'archdiocese' && req.userParish) {
      whereClause += ` AND h.parish_name = ?`;
      queryParams.push(req.userParish);
    }
    
    const [results] = await pool.execute(
      `SELECT DISTINCT fm.member_id as id, fm.full_name, fm.relation_to_head_code, fm.sex_code, fm.age,
              h.purok_gimong, h.barangay_name, h.municipality, h.parish_name
       FROM family_members fm
       INNER JOIN households h ON fm.household_id = h.household_id
       ${whereClause}
       ORDER BY fm.full_name ASC
       LIMIT 10`,
      queryParams
    );
    
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
    const [member] = await pool.execute(
      `SELECT household_id FROM family_members WHERE member_id = ?`,
      [id]
    );
    
    if (member.length === 0) {
      return res.status(404).json({ error: "Participant not found" });
    }
    
    const householdId = member[0].household_id;
    console.log(`Found member_id=${id} belongs to household_id=${householdId}`);
    
    // Get household information
    const [household] = await pool.execute(
      `SELECT * FROM households WHERE household_id = ?`,
      [householdId]
    );
    
    if (household.length === 0) {
      return res.status(404).json({ error: "Household not found" });
    }
    
    // Check if parish user has access to this household
    if (req.userRole !== 'archdiocese' && req.userParish) {
      if (household[0].parish_name !== req.userParish) {
        console.log(`Access denied: User ${req.userParish} cannot access household from parish ${household[0].parish_name}`);
        return res.status(403).json({ error: "Access denied: You can only view data from your own parish" });
      }
    }
    
    // Get all family members for this household
    const [family_members] = await pool.execute(
      `SELECT * FROM family_members WHERE household_id = ? ORDER BY member_id`,
      [householdId]
    );
    
    // Get health conditions
    const [health_conditions] = await pool.execute(
      `SELECT * FROM health_conditions WHERE household_id = ?`,
      [householdId]
    );
    
    // Get socio-economic data
    const [socio_economic] = await pool.execute(
      `SELECT * FROM socio_economic WHERE household_id = ?`,
      [householdId]
    );
    
    res.json({
      household: household[0] || {},
      family_members: family_members || [],
      health_conditions: health_conditions[0] || {},
      socio_economic: socio_economic[0] || {},
      userRole: req.userRole,
      userParish: req.userParish
    });
    
  } catch (err) {
    console.error("Participant Details Error:", err);
    res.status(500).json({ error: "Failed to retrieve participant details" });
  }
});
module.exports = router;