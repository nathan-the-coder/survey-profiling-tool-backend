const express = require('express');
const router = express.Router();
const DatabaseAbstraction = require('../config/db-abstraction');

const dbAbstraction = new DatabaseAbstraction();

const validateValue = (value) => (value === undefined || value === '' ? null : value);

const getValue = (obj, key) => (obj && obj[key] ? validateValue(obj[key]) : null);

const getArrayValue = (obj, key) => {
  if (!obj || !obj[key]) return null;
  const val = obj[key];
  if (Array.isArray(val)) {
    return val.length > 0 ? val : null;
  }
  return val ? [val] : null;
};

router.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Survey Profiling API', status: 'Online', version: '1.0' });
});

router.get('/test-connection', async (req, res) => {
  try {
    const parishes = await dbAbstraction.getAllParishes();
    res.json({ 
      status: 'connected',
      message: 'Backend is connected to database',
      parishesCount: parishes.length
    });
  } catch (err) {
    console.error('Connection test error:', err);
    res.status(500).json({ 
      status: 'error',
      message: 'Database connection failed',
      error: err.message 
    });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  
  try {
    const user = await dbAbstraction.getUserByUsername(username);
    
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Determine user role
    const isArchdiocese = username === 'Archdiocese of Tuguegarao';
    const isAdmin = username === 'SJCB_Admin' || username.toLowerCase().includes('admin');
    const role = isArchdiocese ? 'archdiocese' : (isAdmin ? 'admin' : 'parish');

    res.status(200).json({ message: 'Login successful', user: { username: user.username, role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/submit-survey', async (req, res) => {
  if (!req.body || !req.body.data) {
    return res.status(400).json({ error: 'Invalid request data' });
  }
  
  const { general, primary, health, socio } = req.body.data;
  
  const toBoolean = (val) => {
    if (val === '1' || val === 1 || val === true) return true;
    if (val === '2' || val === 2 || val === false || val === '66' || val === null || val === '') return false;
    return null;
  };
  
  const toNumber = (val) => {
    if (val === '' || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };
  
  const validateValue = (value) => (value === undefined || value === '' ? null : value);
  const getValue = (obj, key) => (obj && obj[key] ? validateValue(obj[key]) : null);
  const getNumber = (obj, key) => toNumber(getValue(obj, key));
  
  try {
    const householdData = {
      purok_gimong: getValue(general, 'purokGimong'),
      barangay_name: getValue(general, 'barangayName'),
      municipality: getValue(general, 'municipality-select') || getValue(general, 'municipalityName'),
      province: getValue(general, 'provinceName'),
      mode_of_transportation: getArrayValue(general, 'modeOfTransportation'),
      road_structure: getValue(general, 'road_Structure'),
      urban_rural_classification: getValue(general, 'urban_ruralClassification'),
      parish_name: getValue(general, 'nameOfParish'),
      diocese_prelature: getValue(general, 'diocesePrelatureName'),
      years_residency: getNumber(general, 'yrOfResInTheCommunity'),
      num_family_members: getNumber(general, 'numOfFamMembers'),
      family_structure: getValue(general, 'familyStructure'),
      local_dialect: getValue(general, 'lclDialect'),
      ethnicity: getValue(general, 'ethnicity'),
      missionary_companion: getValue(socio, 'missionary_companion'),
      date_of_listing: getValue(socio, 'listening_date')
    };

    console.log('Creating household with data:', JSON.stringify(householdData));
    const householdId = await dbAbstraction.createHousehold(householdData);
    console.log('Household created, ID:', householdId);
    
    const insertMember = async (role, data) => {
      if (data.full_name) {
        await dbAbstraction.createFamilyMember({ household_id: householdId, role, ...data });
      }
    };

    await insertMember('HH Head', {
      full_name: getValue(primary, 'head_name'),
      type_of_marriage: getValue(primary, 'head_marriage'),
      civil_status_code: getValue(primary, 'civil_status_code') || '',
      religion_code: getValue(primary, 'head_religion'),
      sex_code: getValue(primary, 'head_sex'),
      age: getNumber(primary, 'head_age'),
      highest_educ_attainment: getValue(primary, 'head_educ'),
      occupation: getValue(primary, 'head_job'),
      status_of_work_code: getValue(primary, 'head_work_status')
    });
    console.log('HH Head created');

    await insertMember('Spouse', {
      full_name: getValue(primary, 'spouse_name') || '',
      civil_status_code: getValue(primary, 'civil_status_code') || '',
      type_of_marriage: getValue(primary, 'spouse_marriage') || '',
      religion_code: getValue(primary, 'spouse_religion') || '',
      sex_code: getValue(primary, 'spouse_sex') || '',
      age: getNumber(primary, 'spouse_age') || '',
      highest_educ_attainment: getValue(primary, 'spouse_educ') || '',
      occupation: getValue(primary, 'spouse_job') || '',
      status_of_work_code: getValue(primary, 'spouse_work_status') || ''
    });
    console.log('Spouse created');

    if (primary?.m_name && Array.isArray(primary.m_name)) {
      const memberInserts = primary.m_name.map((name, i) => {
        if (!name) return null;
        const memberData = {
          household_id: householdId,
          role: primary.m_role?.[i] || 'Member',
          full_name: name,
          relation_to_head_code: primary.m_relation?.[i],
          sex_code: primary.m_sex?.[i],
          age: getNumber({ m_age: primary.m_age?.[i] }, 'm_age'),
          civil_status_code: primary.m_civil?.[i],
          religion_code: primary.m_religion?.[i],
          sacraments_code: getArrayValue({ m_sacraments: primary.m_sacraments }, 'm_sacraments'),
          is_studying: toBoolean(primary.m_studying?.[i]),
          highest_educ_attainment: primary.m_educ?.[i],
          occupation: primary.m_job?.[i],
          status_of_work_code: primary.m_work_status?.[i],
          fully_immunized_child: toBoolean(primary.m_immunized?.[i]),
          organization_code: getArrayValue({ m_organization: primary.m_organization }, 'm_organization'),
          position: primary.m_position?.[i] || null
        };
        console.log(`Creating member ${i}:`, {
          civil_status_code: primary.m_civil?.[i],
          relation_to_head_code: primary.m_relation?.[i],
          sex_code: primary.m_sex?.[i]
        });
        return dbAbstraction.createFamilyMember(memberData);
      }).filter(Boolean);
      
      await Promise.all(memberInserts);
    }
    console.log('Family members created');

    const healthData = {
      household_id: householdId,
      common_illness_codes: getArrayValue(health, 'common_illness'),
      treatment_source_code: getArrayValue(health, 'treatment_source'),
      potable_water_source_code: getArrayValue(health, 'water_source'),
      lighting_source_code: getArrayValue(health, 'lighting_source'),
      cooking_source_code: getArrayValue(health, 'cooking_source'),
      garbage_disposal_code: getArrayValue(health, 'garbage_disposal'),
      toilet_facility_code: getArrayValue(health, 'toilet_type'),
      water_to_toilet_distance_code: getValue(health, 'toilet_distance')
    };
    console.log('Creating health conditions:', JSON.stringify(healthData));
    await dbAbstraction.createHealthConditions(healthData);
    console.log('Health conditions created');

    const socioData = {
      household_id: householdId,
      income_monthly_code: getValue(socio, 'income_monthly'),
      expenses_weekly_code: getValue(socio, 'expenses_weekly'),
      has_savings: toBoolean(getValue(socio, 'has_savings')),
      savings_location_code: getArrayValue(socio, 'savings_location'),
      house_lot_ownership_code: getArrayValue(socio, 'house_ownership'),
      house_classification_code: getArrayValue(socio, 'house_classification'),
      land_area_hectares: getNumber(socio, 'land_area'),
      dist_from_church_code: getValue(socio, 'distance_church'),
      dist_from_market_code: getValue(socio, 'distance_market'),
      organizations: getArrayValue(socio, 'organizations'),
      organizations_others_text: getValue(socio, 'organizations_others_text')
    };
    console.log('Creating socio-economic:', JSON.stringify(socioData));
    await dbAbstraction.createSocioEconomic(socioData);
    console.log('Socio-economic created');

    res.status(200).json({ success: true, message: 'Survey data saved successfully', id: householdId });
  } catch (err) {
    console.error('Survey submission error:', err);
    console.error('Error details:', JSON.stringify({
      code: err.code,
      message: err.message,
      hint: err.hint,
      details: err.details
    }));
    res.status(500).json({ error: err.message || 'Internal Server Error', details: err.code });
  }
});

router.get('/test', (req, res) => {
  res.json({ message: 'Backend is working!', timestamp: new Date().toISOString() });
});

router.get('/search-participants', async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 2) {
    return res.json([]);
  }
  
  try {
    const results = await dbAbstraction.searchParticipants(q, req.userRole, req.userParish);
    res.json(results);
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
});

router.get('/participant/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`[Backend] Fetching participant details for ID: ${id}`);
  
  if (!id || isNaN(id)) {
    console.log(`[Backend] Invalid participant ID: ${id}`);
    return res.status(400).json({ error: 'Invalid participant ID' });
  }
  
  try {
    console.log(`[Backend] Looking up family member with member_id: ${id}`);
    const member = await dbAbstraction.getMemberById(id);
    
    if (!member) {
      console.log(`[Backend] Family member not found with ID: ${id}`);
      return res.status(404).json({ error: `Family member with ID ${id} not found` });
    }
    
    console.log(`[Backend] Found member:`, member);
    const householdId = member.household_id;
    console.log(`[Backend] Looking up household with household_id: ${householdId}`);
    const household = await dbAbstraction.getHousehold(householdId);
    
    if (!household) {
      console.log(`[Backend] Household not found with ID: ${householdId}`);
      return res.status(404).json({ error: `Household with ID ${householdId} not found` });
    }
    
    console.log(`[Backend] Found household:`, household);
    
    if (req.userRole !== 'archdiocese' && req.userParish && household.parish_name !== req.userParish) {
      return res.status(403).json({ error: 'Access denied: You can only view data from your own parish' });
    }
    
    const [family_members, health_conditions, socio_economic] = await Promise.all([
      dbAbstraction.getFamilyMembersByHousehold(householdId),
      dbAbstraction.getHealthConditions(householdId),
      dbAbstraction.getSocioEconomic(householdId)
    ]);
    
    res.json({
      household: household || {},
      family_members: family_members || [],
      health_conditions: health_conditions || {},
      socio_economic: socio_economic || {},
      userRole: req.userRole,
      userParish: req.userParish
    });
  } catch (err) {
    console.error('Participant details error:', err);
    res.status(500).json({ error: 'Failed to retrieve participant details' });
  }
});

router.get('/parishes', async (req, res) => {
  try {
    const parishes = await dbAbstraction.getAllParishes();
    res.json(parishes);
  } catch (err) {
    console.error('Get parishes error:', err);
    res.status(500).json({ error: 'Failed to fetch parishes' });
  }
});

router.get('/all-participants', async (req, res) => {
  try {
    const results = await dbAbstraction.getAllParticipants(req.userRole, req.userParish);
    res.json(results);
  } catch (err) {
    console.error('Get all participants error:', err);
    res.status(500).json({ error: 'Failed to fetch participants', details: err.message });
  }
});

router.delete('/participant/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'Invalid participant ID' });
  }
  
  try {
    // First get the member to find the household_id
    const member = await dbAbstraction.getMemberById(id);
    
    if (!member) {
      return res.status(404).json({ error: 'Participant not found' });
    }
    
    const householdId = member.household_id;
    
    // Delete the family member
    await dbAbstraction.deleteFamilyMember(id);
    
    // Check if there are other members in this household
    const remainingMembers = await dbAbstraction.getFamilyMembersByHousehold(householdId);
    
    // If no remaining members, delete the household and related records
    if (remainingMembers.length === 0) {
      await dbAbstraction.deleteHousehold(householdId);
    }
    
    res.json({ message: 'Participant deleted successfully' });
  } catch (err) {
    console.error('Delete participant error:', err);
    res.status(500).json({ error: 'Failed to delete participant' });
  }
});

router.put('/participant/:id', async (req, res) => {
  const { id } = req.params;
  const { household, family_members, health_conditions, socio_economic } = req.body;
  
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'Invalid participant ID' });
  }
  
  try {
    const member = await dbAbstraction.getMemberById(id);
    if (!member) {
      return res.status(404).json({ error: 'Participant not found' });
    }
    
    const householdId = member.household_id;
    
    if (household) {
      await dbAbstraction.updateHousehold(householdId, {
        purok_gimong: household.purok_gimong,
        barangay_name: household.barangay_name,
        municipality: household.municipality,
        province: household.province,
        urban_rural_classification: household.urban_rural_classification,
        parish_name: household.parish_name,
        diocese_prelature: household.diocese_prelature,
        years_residency: household.years_residency,
        num_family_members: household.num_family_members,
        family_structure: household.family_structure,
        local_dialect: household.local_dialect,
        ethnicity: household.ethnicity
      });
    }
    
    if (family_members && Array.isArray(family_members)) {
      for (const fm of family_members) {
        if (fm.member_id) {
          await dbAbstraction.updateFamilyMember(fm.member_id, {
            full_name: fm.full_name,
            role: fm.role,
            relation_to_head_code: fm.relation_to_head_code,
            sex_code: fm.sex_code,
            age: fm.age,
            civil_status_code: fm.civil_status_code,
            religion_code: fm.religion_code,
            sacraments_code: fm.sacraments_code,
            is_studying: fm.is_studying,
            highest_educ_attainment: fm.highest_educ_attainment,
            occupation: fm.occupation,
            status_of_work_code: fm.status_of_work_code,
            organization_code: fm.organization_code,
            position: fm.position
          });
        }
      }
    }
    
    if (health_conditions) {
      await dbAbstraction.updateHealthConditions(householdId, {
        common_illness_codes: health_conditions.common_illness_codes,
        treatment_source_code: health_conditions.treatment_source_code,
        potable_water_source_code: health_conditions.potable_water_source_code,
        lighting_source_code: health_conditions.lighting_source_code,
        cooking_source_code: health_conditions.cooking_source_code,
        garbage_disposal_code: health_conditions.garbage_disposal_code,
        toilet_facility_code: health_conditions.toilet_facility_code,
        water_to_toilet_distance_code: health_conditions.water_to_toilet_distance_code
      });
    }
    
    if (socio_economic) {
      await dbAbstraction.updateSocioEconomic(householdId, {
        income_monthly_code: socio_economic.income_monthly_code,
        expenses_weekly_code: socio_economic.expenses_weekly_code,
        has_savings: socio_economic.has_savings,
        savings_location_code: socio_economic.savings_location_code,
        house_lot_ownership_code: socio_economic.house_lot_ownership_code,
        house_classification_code: socio_economic.house_classification_code,
        land_area_hectares: socio_economic.land_area_hectares,
        dist_from_church_code: socio_economic.dist_from_church_code,
        dist_from_market_code: socio_economic.dist_from_market_code,
        organizations: socio_economic.organizations,
        organizations_others_text: socio_economic.organizations_others_text
      });
    }
    
    res.json({ message: 'Participant updated successfully' });
  } catch (err) {
    console.error('Update participant error:', err);
    res.status(500).json({ error: 'Failed to update participant', details: err.message });
  }
});

module.exports = router;