/**
 * Health Guidance Service
 * Provides comprehensive health impacts, protective measures, and risk group guidance
 * based on AQI levels to help users make informed health decisions.
 */

export const HEALTH_GUIDANCE_DATA = [
  {
    level: 0,
    category: "Good",
    aqi_range: "0-50",
    health_statement: "Air quality is satisfactory and air pollution poses little to no risk.",
    
    // Health impacts
    health_impacts: {
      general_population: "No health effects expected.",
      susceptible_groups: "No health effects expected.",
      children: "Safe for all outdoor activities.",
      elderly: "No restrictions.",
      pregnant: "Safe for normal activities."
    },
    
    // Primary health effects to watch for
    symptoms_to_watch: [],
    
    // Risk groups (who is most affected)
    risk_groups: [
      {
        name: "General Population",
        description: "Everyone",
        risk_level: "None",
        guidance: "No precautions needed. Enjoy outdoor activities as normal."
      }
    ],
    
    // Protective measures
    protective_measures: {
      outdoor: [
        "No restrictions. All outdoor activities are safe.",
        "Great time for outdoor exercise, sports, and recreation."
      ],
      indoor: [
        "Normal ventilation is adequate.",
        "Keep windows open for fresh air."
      ],
      personal_protection: [
        "No masks or special protection needed."
      ],
      medication: [
        "Continue normal medication routines."
      ]
    },
    
    // Exposure limits and timing
    exposure_guidance: {
      recommended_outdoor_time: "Unlimited",
      heavy_exertion: "Safe outdoors",
      children_outdoor_time: "Unlimited",
      vulnerable_persons_outdoor_time: "Unlimited"
    },
    
    // Activity recommendations with duration
    activities_detailed: {
      exercise: {
        status: "safe",
        duration: "Unlimited",
        intensity: "Vigorous exercise is safe",
        notes: "Ideal conditions for outdoor activities."
      },
      school_sport: {
        status: "safe",
        duration: "Normal schedules",
        intensity: "All sports safe outdoors",
        notes: "No changes needed to school schedules."
      },
      farming: {
        status: "safe",
        duration: "Normal working hours",
        intensity: "Normal operations",
        notes: "No protective equipment needed."
      },
      construction: {
        status: "safe",
        duration: "Normal working hours",
        intensity: "Normal operations",
        notes: "No respiratory protection required."
      }
    },
    
    // Indoor air quality measures
    indoor_air_measures: [
      "Standard household ventilation is sufficient.",
      "Maintain regular air exchange with outdoors."
    ],
    
    // Health tips
    health_tips: [
      "Great day to exercise outdoors or enjoy outdoor activities.",
      "This is optimal air quality for respiratory health."
    ]
  },
  
  {
    level: 1,
    category: "Moderate",
    aqi_range: "51-100",
    health_statement: "Air quality is acceptable for most, but some members of sensitive groups may experience minor respiratory symptoms.",
    
    health_impacts: {
      general_population: "Most people can engage in outdoor activities normally.",
      susceptible_groups: "Unusually sensitive people should limit prolonged outdoor exertion.",
      children: "Generally safe; sensitive children should limit intense outdoor play.",
      elderly: "Generally safe; reduce heavy outdoor exertion if experiencing symptoms.",
      pregnant: "Safe; avoid strenuous outdoor activities if sensitive to air quality."
    },
    
    symptoms_to_watch: [
      "Coughing",
      "Throat irritation",
      "Breathing discomfort during exertion",
      "Wheezing (for people with asthma)"
    ],
    
    risk_groups: [
      {
        name: "Children",
        description: "Especially those engaged in outdoor sports",
        risk_level: "Low to Moderate",
        guidance: "Monitor for signs of discomfort. Limit intense outdoor activities if symptoms appear. Increase rest breaks during outdoor play."
      },
      {
        name: "Elderly",
        description: "People aged 65+",
        risk_level: "Low to Moderate",
        guidance: "Reduce intense outdoor exertion. Take frequent breaks if exercising outdoors. Stay well-hydrated."
      },
      {
        name: "People with Respiratory Conditions",
        description: "Asthma, COPD, bronchitis",
        risk_level: "Moderate",
        guidance: "Carry rescue inhalers when outdoors. Limit heavy exertion. Consider staying indoors if symptoms worsen. Monitor peak flow rates."
      },
      {
        name: "People with Heart Disease",
        description: "Cardiovascular conditions",
        risk_level: "Moderate",
        guidance: "Avoid strenuous exertion outdoors. Take frequent rest breaks. Remain well-hydrated."
      },
      {
        name: "Pregnant Women",
        description: "Especially if sensitive to air quality",
        risk_level: "Low",
        guidance: "Reduce strenuous outdoor activities. Choose cooler times of day for outdoor exposure if possible."
      }
    ],
    
    protective_measures: {
      outdoor: [
        "Reduce prolonged or heavy outdoor exertion.",
        "Schedule outdoor activities for early morning or evening when AQI may be lower.",
        "Limit outdoor time if experiencing respiratory symptoms.",
        "Take frequent rest breaks during outdoor activities."
      ],
      indoor: [
        "Keep windows closed during peak pollution times (typically midday to evening).",
        "Use air purifiers with HEPA filters if available.",
        "Vacuum regularly with HEPA filters to reduce indoor dust."
      ],
      personal_protection: [
        "N95 or KN95 masks may help sensitive individuals; consult healthcare provider."
      ],
      medication: [
        "Have rescue inhalers readily available if you have asthma.",
        "Take regular medications as prescribed."
      ]
    },
    
    exposure_guidance: {
      recommended_outdoor_time: "Limit strenuous activities to 30-60 minutes for sensitive individuals",
      heavy_exertion: "Reduce for sensitive groups",
      children_outdoor_time: "Limit intense outdoor play to 1-2 hours if sensitive",
      vulnerable_persons_outdoor_time: "Limit to 1-2 hours; increase rest time"
    },
    
    activities_detailed: {
      exercise: {
        status: "limit if sensitive",
        duration: "30-60 minutes for sensitive groups",
        intensity: "Reduce high-intensity for susceptible people",
        notes: "Most can continue normal exercise. Unusually sensitive people should limit exertion."
      },
      school_sport: {
        status: "safe with monitoring",
        duration: "Standard practice but monitor for symptoms",
        intensity: "Consider reducing practice intensity for sensitive athletes",
        notes: "Watch for respiratory symptoms. Have inhalers available if needed."
      },
      farming: {
        status: "safe with breaks",
        duration: "Normal hours with frequent breaks",
        intensity: "Take 10-15 minute breaks every hour",
        notes: "Drink plenty of water. Use mask if sensitive."
      },
      construction: {
        status: "safe with breaks",
        duration: "Normal hours with frequent breaks",
        intensity: "Take 15-minute breaks every hour",
        notes: "Sensitive workers should consider respiratory protection."
      }
    },
    
    indoor_air_measures: [
      "Close windows during peak hours (11 AM - 5 PM).",
      "Use portable air purifiers in main living areas.",
      "Ensure HVAC filters are clean and changed regularly.",
      "Avoid smoking and other indoor air pollutants."
    ],
    
    health_tips: [
      "This is a good day for sensitive individuals to monitor their symptoms.",
      "Avoid outdoor air pollution by scheduling activities during cooler morning hours.",
      "Stay well-hydrated throughout the day.",
      "If you experience coughing or throat irritation, reduce outdoor time.",
      "Keep air purifiers running in bedrooms during sleep for better air quality."
    ]
  },
  
  {
    level: 2,
    category: "Unhealthy for Sensitive Groups",
    aqi_range: "101-150",
    health_statement: "Members of sensitive groups may experience health effects. The general public is less likely to be affected.",
    
    health_impacts: {
      general_population: "Most members of the general public can continue normal outdoor activities.",
      susceptible_groups: "Sensitive group members may experience health effects and should reduce outdoor exertion.",
      children: "Children should have outdoor activity restricted; keep breaks frequent and short.",
      elderly: "Reduce outdoor activities and exertion.",
      pregnant: "Avoid outdoor exertion; stay indoors in air-conditioned environments if possible."
    },
    
    symptoms_to_watch: [
      "Coughing and throat irritation",
      "Breathing difficulties during exertion",
      "Wheezing or chest tightness",
      "Fatigue or shortness of breath",
      "Asthma attacks in people with asthma"
    ],
    
    risk_groups: [
      {
        name: "Children",
        description: "All outdoor-active children",
        risk_level: "High",
        guidance: "Restrict outdoor activities. Keep breaks frequent (every 30 minutes). Watch for signs of respiratory distress. Move play indoors if symptoms occur."
      },
      {
        name: "Elderly (65+)",
        description: "All elderly persons, especially active ones",
        risk_level: "High",
        guidance: "Limit outdoor time significantly. Avoid heavy exertion. Consider staying mostly indoors. Maintain adequate hydration and rest."
      },
      {
        name: "People with Asthma",
        description: "All asthmatic individuals",
        risk_level: "Very High",
        guidance: "Limit or avoid outdoor activities. Keep rescue inhalers accessible at all times. Consider staying indoors. Monitor for asthma attacks."
      },
      {
        name: "People with COPD/Chronic Bronchitis",
        description: "All individuals with chronic respiratory conditions",
        risk_level: "Very High",
        guidance: "Avoid outdoor activities. Stay indoors in controlled environment. Use respiratory protection if exposure is unavoidable. Monitor oxygen levels if available."
      },
      {
        name: "People with Cardiovascular Disease",
        description: "Heart disease, hypertension, angina",
        risk_level: "High",
        guidance: "Avoid outdoor exertion. Remain mostly indoors. Take medications as prescribed. Seek emergency care if chest pain develops."
      },
      {
        name: "Pregnant Women",
        description: "All pregnant women",
        risk_level: "Moderate to High",
        guidance: "Minimize outdoor time. Stay in air-conditioned or filtered environments. Avoid any strenuous activity outdoors."
      }
    ],
    
    protective_measures: {
      outdoor: [
        "Limit outdoor time to 30 minutes or less for sensitive groups.",
        "Avoid strenuous outdoor activities completely if sensitive.",
        "Postpone outdoor activities until air quality improves.",
        "Wear N95 or KN95 masks when outdoors if exposure is necessary.",
        "Avoid outdoor areas near traffic or industrial sources."
      ],
      indoor: [
        "Keep windows and doors closed.",
        "Use air purifiers with HEPA filters continuously.",
        "Seal window frames with weather stripping to reduce outdoor air infiltration.",
        "Use air conditioning with recirculation mode.",
        "Vacuum daily with HEPA filter to remove dust."
      ],
      personal_protection: [
        "N95 or KN95 masks recommended for sensitive individuals when outdoors.",
        "Respirators with P100 filters for people with severe respiratory conditions.",
        "Ensure masks fit properly for maximum protection."
      ],
      medication: [
        "Have rescue inhalers immediately available.",
        "Take preventive inhalers as prescribed.",
        "Keep emergency medications accessible.",
        "Call healthcare provider if symptoms worsen despite medication use."
      ]
    },
    
    exposure_guidance: {
      recommended_outdoor_time: "15-30 minutes maximum for sensitive groups",
      heavy_exertion: "Avoid completely for sensitive groups",
      children_outdoor_time: "Restrict to 15-30 minutes; increase indoor time significantly",
      vulnerable_persons_outdoor_time: "Minimize to 15-30 minutes when necessary; mostly remain indoors"
    },
    
    activities_detailed: {
      exercise: {
        status: "reduce",
        duration: "Sensitive groups: 15-30 minutes light activity only",
        intensity: "No vigorous exercise outdoors for sensitive groups",
        notes: "Sensitive individuals should move exercise indoors. General population can continue with caution."
      },
      school_sport: {
        status: "reduce",
        duration: "Shorten practice by 25-50%",
        intensity: "Reduce intensity and increase rest periods",
        notes: "Move practices indoors or to early morning. Have medical staff present. Monitor athletes carefully."
      },
      farming: {
        status: "take frequent breaks",
        duration: "Work 1 hour, break 15 minutes",
        intensity: "Reduce heavy work; focus on light duties",
        notes: "Use N95 masks. Work during cooler hours. Drink extra water. Watch for heat stress symptoms."
      },
      construction: {
        status: "use protection",
        duration: "Work 1 hour, break 15 minutes",
        intensity: "Reduce strenuous tasks",
        notes: "Use N95 or P100 respirators. Schedule around cooler morning hours. Take frequent hydration breaks."
      }
    },
    
    indoor_air_measures: [
      "Operate HVAC systems with doors and windows closed.",
      "Run air purifiers on high setting continuously.",
      "Close windows and doors - do not open unless necessary.",
      "Use weather stripping to seal gaps around windows and doors.",
      "Consider portable HEPA air purifiers for bedrooms and main living areas.",
      "Replace HVAC filters more frequently (every 1-2 weeks)."
    ],
    
    health_tips: [
      "This is a day to stay indoors if you are in a sensitive group.",
      "Spend time in air-conditioned or air-filtered environments.",
      "Avoid outdoor exertion and heavy physical activity.",
      "Drink plenty of water to help your respiratory system.",
      "If you experience chest pain, shortness of breath, or severe symptoms, seek medical help immediately.",
      "Schools and workplaces should consider canceling outdoor activities or moving them indoors.",
      "Check on elderly neighbors and relatives to ensure they have access to clean air environments.",
      "Pets may also be affected - limit their outdoor time as well."
    ]
  },
  
  {
    level: 3,
    category: "Unhealthy",
    aqi_range: "151-200",
    health_statement: "Everyone may begin to experience health effects. Sensitive groups and the general public should limit outdoor exposure.",
    
    health_impacts: {
      general_population: "General public members may experience noticeable health effects.",
      susceptible_groups: "Severe health effects are likely. Avoid outdoor activities completely.",
      children: "Restrict ALL outdoor activity. Stay indoors.",
      elderly: "Stay indoors. Avoid all outdoor activities.",
      pregnant: "Stay indoors in air-conditioned environment. Avoid any outdoor time."
    },
    
    symptoms_to_watch: [
      "Persistent coughing",
      "Shortness of breath with minimal exertion",
      "Chest tightness or pain",
      "Wheezing and asthma attacks",
      "Eye, nose, and throat irritation",
      "Fatigue and weakness",
      "Severe asthma symptoms"
    ],
    
    risk_groups: [
      {
        name: "Children",
        description: "All children",
        risk_level: "Critical",
        guidance: "KEEP INDOORS. No outdoor activities. Use air purifiers. Monitor closely for respiratory symptoms. Seek medical care if symptoms develop."
      },
      {
        name: "Elderly (65+)",
        description: "All elderly persons",
        risk_level: "Critical",
        guidance: "STAY INDOORS. No outdoor activities. Remain in air-filtered/conditioned environments. Check on daily needs. Seek medical help if symptoms worsen."
      },
      {
        name: "Infants and Toddlers",
        description: "Children under 5 years",
        risk_level: "Critical",
        guidance: "Keep indoors in air-purified rooms. Avoid strollers and outdoor exposure. Monitor breathing carefully. Seek immediate medical care if breathing difficulty occurs."
      },
      {
        name: "People with Asthma",
        description: "All asthmatic individuals",
        risk_level: "Critical",
        guidance: "STAY INDOORS. Keep rescue inhalers accessible. Be prepared for potential asthma emergencies. Use air purifiers. Seek immediate medical care if experiencing severe symptoms."
      },
      {
        name: "People with COPD",
        description: "All individuals with COPD or chronic bronchitis",
        risk_level: "Critical",
        guidance: "STAY INDOORS in air-conditioned environment. Use oxygen supplementation if available. Monitor oxygen saturation. Seek emergency care if breathing severely compromised."
      },
      {
        name: "People with Cardiovascular Disease",
        description: "Heart disease, arrhythmia, angina",
        risk_level: "Critical",
        guidance: "STAY INDOORS. Minimize physical exertion. Take cardiac medications as prescribed. Seek emergency care if experiencing chest pain or severe shortness of breath."
      },
      {
        name: "Pregnant Women",
        description: "All pregnant women",
        risk_level: "High",
        guidance: "Stay indoors in air-conditioned environments. Avoid all outdoor time. Monitor fetal movement. Contact healthcare provider if experiencing symptoms."
      },
      {
        name: "People with Diabetes",
        description: "Especially Type 2 with cardiovascular complications",
        risk_level: "High",
        guidance: "Limit outdoor exposure. Stay indoors. Monitor blood sugar levels closely. Stay hydrated. Seek medical care if experiencing unusual symptoms."
      }
    ],
    
    protective_measures: {
      outdoor: [
        "AVOID OUTDOOR ACTIVITIES COMPLETELY for sensitive groups.",
        "General public should minimize outdoor time to less than 15 minutes when necessary.",
        "Wear N95/KN95 masks at all times when outdoors (mandatory for sensitive groups).",
        "Avoid outdoor areas near traffic, industrial sites, or areas of congestion.",
        "Do not exercise outdoors."
      ],
      indoor: [
        "KEEP WINDOWS AND DOORS COMPLETELY CLOSED.",
        "Operate HVAC systems on recirculation mode.",
        "Use HEPA air purifiers continuously on maximum setting in all rooms.",
        "Consider sealing windows and doors with weatherstripping for maximum protection.",
        "Avoid opening doors unnecessarily.",
        "Use damp cloths when cleaning to avoid resuspending particles.",
        "Consider purchasing additional portable air purifiers for bedrooms."
      ],
      personal_protection: [
        "N95, KN95, or FFP2 masks required for sensitive individuals outdoors.",
        "P100 respirators recommended for people with severe respiratory conditions.",
        "Proper mask fitting is critical for effectiveness.",
        "Fit-testing recommended for high-risk individuals."
      ],
      medication: [
        "Rescue inhalers must be immediately accessible at all times.",
        "Take all preventive medications as prescribed without fail.",
        "Keep emergency medications on hand.",
        "Have healthcare provider contact information readily available.",
        "Consider having oxygen supplementation available if prescribed."
      ]
    },
    
    exposure_guidance: {
      recommended_outdoor_time: "Minimize to absolute minimum (less than 15 minutes if necessary)",
      heavy_exertion: "Absolutely avoid outdoors for all groups",
      children_outdoor_time: "Keep indoors except for essential needs; use masks if exposure unavoidable",
      vulnerable_persons_outdoor_time: "Keep indoors; no outdoor activities"
    },
    
    activities_detailed: {
      exercise: {
        status: "avoid outdoors",
        duration: "Move all exercise indoors",
        intensity: "Light, indoor activities only",
        notes: "Exercise should be conducted indoors in air-conditioned/filtered environments only."
      },
      school_sport: {
        status: "move indoors",
        duration: "Reschedule for day with better air quality or move entirely indoors",
        intensity: "Reduced intensity if moved indoors",
        notes: "All outdoor sports MUST be canceled or moved indoors. Indoor training preferred."
      },
      farming: {
        status: "limit exposure",
        duration: "Minimize outdoor work; shift to indoor tasks",
        intensity: "Postpone heavy outdoor work",
        notes: "Only essential outdoor work. Use P100 respirators. Work in early morning when possible."
      },
      construction: {
        status: "limit exposure",
        duration: "Minimize outdoor work; shift to indoor tasks",
        intensity: "Consider postponing outdoor work",
        notes: "Use full respirators (P100). Consider postponing non-essential outdoor construction."
      }
    },
    
    indoor_air_measures: [
      "Keep all windows and doors CLOSED.",
      "Run air purifiers continuously on maximum setting.",
      "Use weatherstripping or seal tape on all window frames.",
      "Keep HVAC running on recirculation mode.",
      "Change or clean air filters daily.",
      "Use multiple portable air purifiers if available.",
      "Consider sealing any cracks or gaps in walls or doors.",
      "Avoid cooking with open flames (use microwave or electric cooking methods)."
    ],
    
    health_tips: [
      "STAY INDOORS today. This is a high pollution day.",
      "Spend the day in air-conditioned or air-purified environments.",
      "Avoid all outdoor physical activities and exertion.",
      "Wear N95 masks if any outdoor exposure is absolutely necessary.",
      "Check on elderly relatives and friends. Ensure they have access to clean air environments.",
      "Monitor children and people with respiratory conditions very closely.",
      "If experiencing chest pain, severe shortness of breath, or other severe symptoms, seek emergency medical care immediately.",
      "Stay well-hydrated.",
      "Postpone outdoor events and activities to another day.",
      "Consider working from home or rearranging schedules to minimize outdoor exposure.",
      "Local authorities may issue health advisories - monitor official guidance.",
      "If you experience worsening symptoms despite staying indoors, seek medical attention."
    ]
  },
  
  {
    level: 4,
    category: "Very Unhealthy",
    aqi_range: "201-300",
    health_statement: "Health alert. Serious health effects are possible for everyone. Everyone should limit outdoor exposure.",
    
    health_impacts: {
      general_population: "Everyone may experience serious health effects.",
      susceptible_groups: "Severe and potentially life-threatening health effects are very likely.",
      children: "HIGH RISK for respiratory emergencies. KEEP COMPLETELY INDOORS.",
      elderly: "HIGH RISK. KEEP COMPLETELY INDOORS.",
      pregnant: "HIGH RISK to both mother and fetus. STAY INDOORS."
    },
    
    symptoms_to_watch: [
      "Severe coughing",
      "Difficulty breathing",
      "Chest pain or pressure",
      "Severe wheezing",
      "Fainting or dizziness",
      "Severe eye/nose/throat irritation",
      "Confusion or altered mental status",
      "Rapid or irregular heartbeat"
    ],
    
    risk_groups: [
      {
        name: "Children",
        description: "All children, especially outdoor-active ones",
        risk_level: "CRITICAL - EMERGENCY LEVEL",
        guidance: "KEEP COMPLETELY INDOORS IN AIR-PURIFIED ROOMS. No outdoor activities whatsoever. Monitor breathing continuously. Seek EMERGENCY CARE immediately if any respiratory distress occurs."
      },
      {
        name: "Elderly (65+)",
        description: "All elderly persons",
        risk_level: "CRITICAL - EMERGENCY LEVEL",
        guidance: "REMAIN COMPLETELY INDOORS. Avoid all physical activity. Monitor health continuously. Have emergency contact numbers readily available. Seek EMERGENCY CARE if symptoms occur."
      },
      {
        name: "Infants and Toddlers",
        description: "Children under 5 years",
        risk_level: "CRITICAL - EMERGENCY LEVEL",
        guidance: "KEEP IN AIR-PURIFIED ROOMS. Do NOT expose to outdoor air. Monitor breathing very closely. Have pediatrician on standby. Seek EMERGENCY CARE immediately if breathing changes occur."
      },
      {
        name: "People with Asthma",
        description: "All asthmatic individuals",
        risk_level: "CRITICAL - EMERGENCY LEVEL",
        guidance: "STAY COMPLETELY INDOORS. Keep rescue inhalers within arm's reach at all times. Be prepared for potential severe asthma attacks. Have emergency contacts available. Seek EMERGENCY CARE immediately if severe symptoms occur."
      },
      {
        name: "People with COPD",
        description: "All COPD and chronic bronchitis patients",
        risk_level: "CRITICAL - EMERGENCY LEVEL",
        guidance: "REMAIN COMPLETELY INDOORS. Use oxygen supplementation if available. Monitor oxygen levels if possible. This is a POTENTIAL EMERGENCY. Have emergency services on standby. Seek immediate EMERGENCY CARE if breathing severely compromised."
      },
      {
        name: "People with Cardiovascular Disease",
        description: "Heart disease, arrhythmia, recent MI",
        risk_level: "CRITICAL - EMERGENCY LEVEL",
        guidance: "REMAIN COMPLETELY INDOORS. Minimize all physical exertion. Take all cardiac medications. This day poses HIGH RISK. Have emergency contacts available. Seek EMERGENCY CARE immediately if chest pain or severe symptoms occur."
      },
      {
        name: "Pregnant Women",
        description: "All pregnant women",
        risk_level: "CRITICAL",
        guidance: "STAY COMPLETELY INDOORS in air-conditioned/filtered environment. Avoid all outdoor time. Monitor fetal movement carefully. Contact obstetrician if experiencing unusual symptoms. This poses RISK to mother and baby."
      }
    ],
    
    protective_measures: {
      outdoor: [
        "ABSOLUTELY AVOID ALL OUTDOOR ACTIVITIES.",
        "General public should avoid outdoor exposure except for essential needs.",
        "If outdoor exposure is ABSOLUTELY ESSENTIAL, wear P100 respirators (not just N95).",
        "Minimize outdoor time to absolute bare minimum.",
        "Do not engage in any physical exertion outdoors."
      ],
      indoor: [
        "KEEP ALL WINDOWS AND DOORS COMPLETELY SEALED.",
        "Operate multiple HEPA air purifiers continuously at maximum setting.",
        "Keep HVAC running on recirculation mode.",
        "Consider additional steps: seal window frames with tape, avoid opening doors.",
        "Damp-mop and dust frequently to remove indoor particles.",
        "Avoid any activities that generate indoor air pollution (cooking smoke, etc.).",
        "Consider industrial-grade air cleaning if available."
      ],
      personal_protection: [
        "P100 respirators REQUIRED for any necessary outdoor exposure.",
        "N95 masks minimum for essential outdoor activities.",
        "Proper fit-testing and fit-checking essential.",
        "Medical-grade air purifiers in bedrooms recommended."
      ],
      medication: [
        "Rescue inhalers must be within immediate reach at ALL times.",
        "All preventive medications must be taken without fail.",
        "Emergency medications must be immediately accessible.",
        "Consider staying near healthcare facilities.",
        "Have emergency services number (911/999) easily accessible."
      ]
    },
    
    exposure_guidance: {
      recommended_outdoor_time: "AVOID COMPLETELY. Only for absolute essential needs with full protection.",
      heavy_exertion: "Absolutely NO outdoor exertion for anyone",
      children_outdoor_time: "Keep completely indoors except in air-filtered vehicles for essential needs",
      vulnerable_persons_outdoor_time: "Remain indoors completely"
    },
    
    activities_detailed: {
      exercise: {
        status: "avoid",
        duration: "No outdoor exercise. Indoor only with caution.",
        intensity: "Very light indoor activity only if needed",
        notes: "All outdoor exercise absolutely canceled. Only very light indoor activities recommended."
      },
      school_sport: {
        status: "cancel outdoors",
        duration: "ALL outdoor sports canceled",
        intensity: "N/A - no outdoor sports",
        notes: "All school outdoor activities MUST be canceled. Consider canceling school activities entirely."
      },
      farming: {
        status: "essential only",
        duration: "AVOID. Only emergency work.",
        intensity: "Emergency response only",
        notes: "Only absolutely essential work with full P100 respiratory protection. Consider suspension if possible."
      },
      construction: {
        status: "essential only",
        duration: "AVOID. Only emergency work.",
        intensity: "Emergency response only",
        notes: "All non-essential construction MUST be suspended. Essential work only with full protective equipment."
      }
    },
    
    indoor_air_measures: [
      "SEAL ALL WINDOWS AND DOORS with weatherstripping or tape.",
      "Operate multiple industrial-grade air purifiers continuously.",
      "Keep HVAC on recirculation mode with filters changed daily.",
      "Avoid opening doors and windows entirely.",
      "Use portable HEPA units in every room.",
      "Damp-mop floors daily to control dust.",
      "Avoid cooking that generates smoke (use microwave or boiling only).",
      "Consider sealing any gaps, cracks, or vents in walls.",
      "Use duct tape around window air-conditioner units if present."
    ],
    
    health_tips: [
      "HEALTH EMERGENCY DAY. STAY INDOORS IN CLEAN AIR ENVIRONMENT.",
      "Everyone should remain indoors except for absolute emergencies.",
      "Spend all day in air-conditioned or air-purified environments.",
      "Absolutely NO outdoor physical activity or exertion.",
      "Sensitive groups and chronically ill individuals: This is a CRITICAL day. Monitor health continuously.",
      "If experiencing ANY respiratory distress, chest pain, or severe symptoms: SEEK EMERGENCY CARE IMMEDIATELY.",
      "Call 911/999 or local emergency services if experiencing emergency symptoms.",
      "Check on vulnerable neighbors, elderly relatives, and friends regularly.",
      "Keep emergency contact numbers and medications readily available.",
      "Schools should consider closing or moving all activities indoors.",
      "Workplaces should allow employees to work from home or cancel non-essential work.",
      "Hospital emergency departments may be busy - seek care promptly if needed.",
      "Local health authorities likely issued health emergencies - follow official guidance.",
      "This is a POTENTIALLY LIFE-THREATENING air quality day for vulnerable populations."
    ]
  },
  
  {
    level: 5,
    category: "Hazardous",
    aqi_range: "301+",
    health_statement: "Emergency conditions. Everyone is likely to be affected. The entire population is at risk.",
    
    health_impacts: {
      general_population: "Health alert. Serious health effects for everyone. General public is at HIGH RISK.",
      susceptible_groups: "CRITICAL HEALTH EMERGENCY. Life-threatening effects are very likely.",
      children: "CRITICAL EMERGENCY RISK. Severe health effects certain. Keep completely protected.",
      elderly: "CRITICAL EMERGENCY RISK. Life-threatening conditions likely.",
      pregnant: "CRITICAL EMERGENCY RISK to mother and fetus."
    },
    
    symptoms_to_watch: [
      "SEVERE breathing difficulty",
      "Severe shortness of breath at rest",
      "Chest pain or pressure",
      "Severe coughing with blood or phlegm",
      "Fainting or loss of consciousness",
      "Severe confusion or altered mental state",
      "Rapid or severely irregular heartbeat",
      "SEEK EMERGENCY CARE IMMEDIATELY for any symptoms"
    ],
    
    risk_groups: [
      {
        name: "EVERYONE - GENERAL POPULATION",
        description: "Entire population at risk",
        risk_level: "CRITICAL - HEALTH EMERGENCY",
        guidance: "STAY COMPLETELY INDOORS IN SEALED, AIR-PURIFIED ENVIRONMENT. Minimize all activity. This is a potential LIFE-THREATENING air quality event for vulnerable populations and widespread health emergency risk for all."
      },
      {
        name: "Children",
        description: "ALL children",
        risk_level: "CRITICAL - LIFE-THREATENING",
        guidance: "ISOLATE IN AIR-PURIFIED ROOMS. Monitor breathing constantly. Severe respiratory emergencies expected. Have pediatrician on EMERGENCY STANDBY. Seek IMMEDIATE EMERGENCY CARE at any sign of distress."
      },
      {
        name: "Elderly",
        description: "ALL elderly persons",
        risk_level: "CRITICAL - LIFE-THREATENING",
        guidance: "REMAIN SEALED INDOORS with air purification. Continuous monitoring required. EXPECT HEALTH EMERGENCY. Have emergency services number ready. Seek IMMEDIATE EMERGENCY CARE for any symptoms."
      },
      {
        name: "Infants",
        description: "Infants and toddlers",
        risk_level: "CRITICAL - LIFE-THREATENING",
        guidance: "PROTECT IN MAXIMUM AIR-PURIFIED ENVIRONMENT. Continuous breathing monitoring. SEVERE RESPIRATORY RISK. Keep pediatrician on STANDBY. Seek IMMEDIATE EMERGENCY CARE for any breathing changes."
      },
      {
        name: "Asthmatics",
        description: "ALL people with asthma",
        risk_level: "CRITICAL - LIFE-THREATENING",
        guidance: "REMAIN COMPLETELY INDOORS. Rescue inhalers immediately accessible. EXPECT SEVERE ASTHMA ATTACKS. Have emergency medical team on standby. Seek IMMEDIATE EMERGENCY CARE for severe attacks."
      },
      {
        name: "COPD Patients",
        description: "All COPD, emphysema, chronic bronchitis patients",
        risk_level: "CRITICAL - LIFE-THREATENING EMERGENCY",
        guidance: "THIS IS A MEDICAL EMERGENCY DAY. Remain completely indoors with oxygen if available. Respiratory failure risk is VERY HIGH. Have emergency services on IMMEDIATE STANDBY. This may require EMERGENCY HOSPITALIZATION."
      },
      {
        name: "Cardiac Patients",
        description: "Heart disease, arrhythmia, post-MI",
        risk_level: "CRITICAL - LIFE-THREATENING",
        guidance: "THIS IS A CRITICAL HEALTH THREAT. Remain completely indoors. Cardiac events risk is SIGNIFICANTLY ELEVATED. Have cardiologist and emergency services on STANDBY. Seek IMMEDIATE EMERGENCY CARE for any chest symptoms."
      }
    ],
    
    protective_measures: {
      outdoor: [
        "ABSOLUTELY NO OUTDOOR EXPOSURE FOR ANYONE.",
        "General population should only venture outdoors in vehicles with sealed cabins and recirculating air.",
        "Even brief outdoor exposure dangerous for vulnerable populations.",
        "This is a WEATHER EMERGENCY requiring minimal outdoor exposure even for essential needs."
      ],
      indoor: [
        "SEAL ALL WINDOWS, DOORS, VENTS WITH TAPE.",
        "Operate MAXIMUM NUMBER of industrial air purifiers continuously.",
        "Keep HVAC on full recirculation 24/7.",
        "Change all air filters multiple times daily if necessary.",
        "Consider using heavy plastic sheeting to seal off unused rooms.",
        "Create 'clean room' with multiple air purifiers if possible.",
        "Avoid all indoor pollution sources (cooking, smoking, etc.).",
        "Damp-wipe all surfaces continuously to control dust.",
        "Minimize air exchanges with outdoors to absolute zero."
      ],
      personal_protection: [
        "Full-face respirators with P100 filters mandatory for any outdoor exposure.",
        "Multiple respirators recommended for extended protection.",
        "Professional fit-testing essential.",
        "Consider staying indoors for entire duration of event."
      ],
      medication: [
        "All rescue medications immediately accessible at ALL times.",
        "Emergency medications must be on hand.",
        "Consider relocating to medical facility if high-risk individual.",
        "Have emergency services and healthcare providers on IMMEDIATE CONTACT."
      ]
    },
    
    exposure_guidance: {
      recommended_outdoor_time: "ZERO. Absolutely no outdoor time.",
      heavy_exertion: "NO outdoor exertion for anyone",
      children_outdoor_time: "ZERO - keep completely indoors in air-purified spaces",
      vulnerable_persons_outdoor_time: "ZERO - remain indoors completely"
    },
    
    activities_detailed: {
      exercise: {
        status: "do not do outdoors",
        duration: "No outdoor exercise. Light indoor only if necessary.",
        intensity: "No exertion - rest is recommended",
        notes: "All outdoor activity absolutely prohibited. Remain at rest as much as possible."
      },
      school_sport: {
        status: "cancel",
        duration: "ALL activities canceled",
        intensity: "N/A",
        notes: "All school activities including outdoor sports MUST be canceled. Consider school closure."
      },
      farming: {
        status: "stop if possible",
        duration: "SUSPEND all operations",
        intensity: "N/A",
        notes: "ALL outdoor farming activities must STOP. Suspend operations entirely if possible."
      },
      construction: {
        status: "stop if possible",
        duration: "SUSPEND all operations",
        intensity: "N/A",
        notes: "ALL construction activities must STOP. Suspend all outdoor work immediately."
      }
    },
    
    indoor_air_measures: [
      "SEAL ALL WINDOWS AND DOORS completely with heavy tape.",
      "Operate multiple industrial-grade air purifiers on maximum 24/7.",
      "Keep HVAC on recirculation mode continuously.",
      "Change filters multiple times daily.",
      "Block any air leaks with plastic sheeting and duct tape.",
      "Create designated 'clean room' with highest air purification.",
      "Avoid all cooking and open flames.",
      "Do not use gas stoves - use electric only.",
      "Damp-wipe all surfaces continuously.",
      "Minimize door openings to near-zero.",
      "Use antechambers if possible when doors must be opened."
    ],
    
    health_tips: [
      "THIS IS A HEALTH EMERGENCY. STAY INDOORS IN CLEAN AIR.",
      "EVERYONE should remain completely indoors in air-purified environments.",
      "No outdoor activities for anyone - not even essential needs if avoidable.",
      "This is a CRITICAL HEALTH THREAT, especially to vulnerable populations.",
      "Seek IMMEDIATE EMERGENCY MEDICAL CARE for ANY respiratory symptoms.",
      "Call 911/999 or emergency services for any medical concerns.",
      "Hospitals and emergency services will likely be overwhelmed - seek care promptly.",
      "Check on vulnerable individuals: children, elderly, people with chronic illnesses.",
      "Government health emergencies are likely - follow ALL official guidance.",
      "Consider temporary relocation to areas with better air quality if possible.",
      "This represents a POTENTIAL MASS HEALTH EMERGENCY event.",
      "Schools MUST close. Workplaces should close non-essential operations.",
      "This is equivalent to a WEATHER DISASTER in terms of health impact.",
      "Prepare for potential healthcare system strain and emergency protocols.",
      "IF EXPERIENCING SEVERE SYMPTOMS: DO NOT WAIT - SEEK IMMEDIATE EMERGENCY CARE."
    ]
  }
];

/**
 * Get comprehensive health guidance for a given AQI level
 * @param {number} level - AQI band level (0-5)
 * @returns {Object} Complete health guidance data for that level
 */
export function getHealthGuidance(level) {
  const validLevel = Math.max(0, Math.min(5, Math.floor(level)));
  return HEALTH_GUIDANCE_DATA[validLevel];
}

/**
 * Get risk group guidance for a specific population
 * @param {number} level - AQI band level
 * @param {string} groupName - Name of the risk group to filter for
 * @returns {Object|null} Risk group guidance or null if not found
 */
export function getRiskGroupGuidance(level, groupName) {
  const guidance = getHealthGuidance(level);
  return guidance.risk_groups.find(g => g.name.toLowerCase() === groupName.toLowerCase()) || null;
}

/**
 * Get activity-specific recommendations
 * @param {number} level - AQI band level
 * @param {string} activityName - Activity name (exercise, school_sport, farming, construction)
 * @returns {Object|null} Activity guidance or null
 */
export function getActivityGuidance(level, activityName) {
  const guidance = getHealthGuidance(level);
  return guidance.activities_detailed[activityName] || null;
}

export default {
  HEALTH_GUIDANCE_DATA,
  getHealthGuidance,
  getRiskGroupGuidance,
  getActivityGuidance
};
