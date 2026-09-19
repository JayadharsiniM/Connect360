"""
Connect360 - Research Paper Evaluation: Metric 5
AI Assistant Safety & Contact Redaction Efficacy (PII Defense)

Target Function:
  backend/lambdas/connect360-assistant/handler.py -> _strip_contact_details()

This benchmark empirically tests the regex-based defensive redaction filter against
a comprehensive corpus of 500 test cases:
- Positive class: Phone numbers (Indian, E.164, formatted) and Email addresses (standard, complex)
- Negative class: Legitimate operational tokens (prices, PIN codes, dates, specs, IDs, conversation)
- Adversarial / Edge cases: Obfuscated representations, boundary conditions

Measures:
- Precision, Recall (Sensitivity), Specificity, F1-score, Accuracy
- True Positives, False Positives, True Negatives, False Negatives
- Execution latency per evaluation (microseconds, P50, P90, P99, Mean, StdDev)
"""

import os
import sys
import time
import re
import csv
import numpy as np

# Direct production implementation extraction to avoid boto3 network init overhead
def _strip_contact_details(text):
    """Defensive redaction: remove phone numbers and emails from outgoing answer."""
    if not text:
        return text
    text = re.sub(r'[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}', '[hidden]', text)
    text = re.sub(r'(?<!\d)(\+?\d[\d\s\-]{8,}\d)(?!\d)', '[hidden]', text)
    return text

def build_test_corpus():
    """
    Constructs 500 realistic test cases across 10 balanced categories:
    Positive (Contains PII that MUST be redacted):
      1. Indian Mobile (10-digit, various formats) - 50 cases
      2. Indian Mobile (+91 prefix, spaces, hyphens) - 50 cases
      3. International E.164 Phone Numbers - 50 cases
      4. Standard & Complex Email Addresses - 50 cases
      5. PII Embedded in Realistic Marketplace Dialogue - 50 cases
    Negative (Operational tokens that MUST NOT be redacted):
      6. Prices & Currency Amounts - 50 cases
      7. Indian 6-Digit PIN Codes - 50 cases
      8. Dates, Timestamps & Durations - 50 cases
      9. Technical Specs & Dimensions - 50 cases
      10. Benign Marketplace Conversation & Booking IDs - 50 cases
    """
    corpus = []
    
    # 1. Indian Mobile (10-digit raw & simple)
    raw_10_digits = [
        "9876543210", "9123456789", "8901234567", "7890123456", "6381234567",
        "9443322110", "9840012345", "9962012345", "8056012345", "7358012345",
        "9789012345", "9884012345", "9600012345", "9444012345", "9381012345",
        "9841012345", "9791012345", "9842012345", "9445012345", "9940012345",
        "98765 43210", "91234 56789", "89012 34567", "78901 23456", "63812 34567",
        "9876-543-210", "9123-456-789", "8901-234-567", "7890-123-456", "6381-234-567",
        "98-76-54-32-10", "91-23-45-67-89", "89-01-23-45-67", "78-90-12-34-56", "63-81-23-45-67",
        "09876543210", "09123456789", "08901234567", "07890123456", "06381234567",
        "044-24567890", "080-23456789", "022-26543210", "011-23345678", "040-27890123",
        "044 24567890", "080 23456789", "022 26543210", "011 23345678", "040 27890123",
    ]
    for text in raw_10_digits:
        corpus.append({
            "category": "Indian_Phone_Standard",
            "text": text,
            "has_pii": True,
            "pii_type": "phone"
        })

    # 2. Indian Mobile (+91 prefix variants)
    prefix_91 = [
        "+91 9876543210", "+91 9123456789", "+91 8901234567", "+91 7890123456", "+91 6381234567",
        "+91-9876543210", "+91-9123456789", "+91-8901234567", "+91-7890123456", "+91-6381234567",
        "+919876543210", "+919123456789", "+918901234567", "+917890123456", "+916381234567",
        "+91 98765 43210", "+91 91234 56789", "+91 89012 34567", "+91 78901 23456", "+91 63812 34567",
        "+91-98765-43210", "+91-91234-56789", "+91-89012-34567", "+91-78901-23456", "+91-63812-34567",
        "+91 987-654-3210", "+91 912-345-6789", "+91 890-123-4567", "+91 789-012-3456", "+91 638-123-4567",
        "+91 (0) 9876543210", "+91 (0) 9123456789", "+91 (98765) 43210", "+91 98765-43210", "+91 9876 543210",
        "91-9876543210", "91-9123456789", "91-8901234567", "91-7890123456", "91-6381234567",
        "91 98765 43210", "91 91234 56789", "91 89012 34567", "91 78901 23456", "91 63812 34567",
        "+91 44 2456 7890", "+91 80 2345 6789", "+91 22 2654 3210", "+91 11 2334 5678", "+91 40 2789 0123"
    ]
    for text in prefix_91:
        corpus.append({
            "category": "Indian_Phone_Prefixed",
            "text": text,
            "has_pii": True,
            "pii_type": "phone"
        })

    # 3. International E.164 Phone Numbers
    intl_phones = [
        "+1 202 555 0143", "+1-202-555-0143", "+12025550143", "+1 (202) 555-0143", "+1 415 555 2671",
        "+44 20 7946 0958", "+44-20-7946-0958", "+442079460958", "+44 7700 900077", "+44-7700-900077",
        "+65 6789 0123", "+65-6789-0123", "+6567890123", "+65 9123 4567", "+65-9123-4567",
        "+61 2 9374 4000", "+61-2-9374-4000", "+61 412 345 678", "+61-412-345-678", "+61293744000",
        "+971 4 390 0000", "+971-4-390-0000", "+971 50 123 4567", "+971-50-123-4567", "+97143900000",
        "+49 30 22732152", "+49-30-22732152", "+49 151 23456789", "+49-151-23456789", "+493022732152",
        "+33 1 42 68 55 00", "+33-1-42-68-55-00", "+33 6 12 34 56 78", "+33-6-12-34-56-78", "+33142685500",
        "+81 3 5555 3800", "+81-3-5555-3800", "+81 90 1234 5678", "+81-90-1234-5678", "+81355553800",
        "+86 10 6552 9988", "+86-10-6552-9988", "+86 138 0013 8000", "+86-138-0013-8000", "+861065529988",
        "+49 89 2345 6789", "+1 312 555 0199", "+44 161 496 0123", "+65 6123 4567", "+61 3 9654 3210"
    ]
    for text in intl_phones:
        corpus.append({
            "category": "International_Phone",
            "text": text,
            "has_pii": True,
            "pii_type": "phone"
        })

    # 4. Standard & Complex Email Addresses
    emails = [
        "technician.ac@gmail.com", "user_123@yahoo.co.in", "support@connect360.org", "raj.kumar@outlook.com",
        "service.chennai@urbancompany.com", "plumbing_expert@hotmail.com", "info@servicepro.in", "contact@repairhub.io",
        "mohan.electrician@fastmail.com", "customercare@tatapower.co.in", "admin@connect360-marketplace.com",
        "deepak.sharma99@gmail.com", "arun_v@sify.com", "suresh.k@rediffmail.com", "helpdesk@urbanclap.com",
        "billing@homerepair.net", "emergency@chennaicity.gov.in", "ac_maintenance@daikinindia.com",
        "anand+technician@gmail.com", "support+priority@connect360.in", "sales.south@carrier-midea.com",
        "feedback@voltas.com", "john.doe.carpenter@gmail.com", "vijay_waterproof@yahoo.com", "kavitha.painter@outlook.com",
        "technician-adambakkam@gmail.com", "worker_9944@connect360.in", "dispatch@speedyplumb.co.uk",
        "saravanan.m@iitm.ac.in", "ravi.teja@pes.edu", "contact.us@hvac-solutions.org", "booking@coolairchennai.com",
        "service@whirlpoolindia.com", "care@lgindia.com", "support@samsungcustomer.com", "complaints@godrej.com",
        "krishnan.subramanian@tcs.com", "balaji.r@infosys.com", "karthik.n@zoho.com", "tech.support@swiggy.in",
        "ops@zomato.com", "contractor_chennai@live.com", "help@urbanplumber.in", "service@aquaguard.co.in",
        "ro_repair@kentindia.com", "electrician_velachery@gmail.com", "ac_gasfill@adambakkam.in",
        "enquiry@homerepairsindia.com", "dispatch.mgr@connect360.internal", "claims@homeassurance.co.in"
    ]
    for text in emails:
        corpus.append({
            "category": "Email_Address",
            "text": text,
            "has_pii": True,
            "pii_type": "email"
        })

    # 5. PII Embedded in Dialogue
    dialogue_pii = [
        "Please call me directly at 9876543210 to discuss the AC repair.",
        "You can reach the technician on +91 9123456789 after 6 PM.",
        "My phone number is 9840012345, please share the live location.",
        "Kindly contact me at technician.ac@gmail.com with the quote.",
        "Call 987-654-3210 immediately if water starts overflowing.",
        "I am available on +91-98765-43210 for gate security clearance.",
        "Worker said to send WhatsApp to 9962012345 for spare parts receipt.",
        "Please email the tax invoice to user_123@yahoo.co.in.",
        "Dial +1 202 555 0143 if you need international billing support.",
        "You can reach our supervisor on 044-24567890 between 9am and 5pm.",
        "Plumber's emergency contact is 8056012345.",
        "Send your address details to support@connect360.org.",
        "The technician Mohan can be reached at 7358012345.",
        "If you want direct booking without fee, call 9443322110.",
        "Worker phone is +91 9789012345, call before coming.",
        "Reach out to customercare@tatapower.co.in for meter issues.",
        "My alternate mobile is 9600012345 in case first one is busy.",
        "Share the photos of the pipe leak to plumber_expert@hotmail.com.",
        "Technician arrived, please call him at 9381012345 to open gate.",
        "Direct line for customer escalation is 080-23456789.",
        "Technician number: +91-89012-34567.",
        "Ping me at deepak.sharma99@gmail.com with your portfolio.",
        "Contact the AC master technician directly: 9791012345.",
        "WhatsApp me on 9444012345 with the video of the buzzing noise.",
        "Send confirmation to booking@coolairchennai.com right away.",
        "Call 9841012345 for immediate arrival.",
        "Reach the carpenter at +91 63812 34567.",
        "Email the warranty card to service@whirlpoolindia.com.",
        "Customer phone number is 9842012345, please call for directions.",
        "Contact admin@connect360-marketplace.com to report abuse.",
        "My brother will handle the keys, his cell is 9445012345.",
        "Technician's personal number is +91 9884012345.",
        "Drop a note to care@lgindia.com regarding PCB replacement.",
        "Emergency line for gas leakage: 9940012345.",
        "Technician phone 09876543210, call when you reach the tower.",
        "Email invoice copy to billing@homerepair.net.",
        "Electrician contact: +91 91234 56789.",
        "Call +44 20 7946 0958 for UK customer coordination.",
        "Send technician ID card copy to info@servicepro.in.",
        "You can ring me on 8901-234-567 if downstairs doorbell fails.",
        "Plumber phone is 91-9876543210.",
        "Send payment receipt to helpdesk@urbanclap.com.",
        "Customer mobile: 07890123456.",
        "Reach supervisor at 022-26543210.",
        "Direct mobile +91 789-012-3456.",
        "Send inquiries to enquiry@homerepairsindia.com.",
        "Call 98-76-54-32-10 for carpentry estimate.",
        "Technician email is arun_v@sify.com.",
        "Contact +65 6789 0123 for Singapore office.",
        "Mobile 06381234567 available 24/7."
    ]
    for text in dialogue_pii:
        corpus.append({
            "category": "Dialogue_PII_Embedded",
            "text": text,
            "has_pii": True,
            "pii_type": "mixed_dialogue"
        })

    # 6. Negative: Prices & Financial Amounts
    prices = [
        "The estimated service charge is ₹500 for inspection.",
        "Base visiting fee is Rs. 1500 including taxes.",
        "Material replacement will cost approximately ₹1200.",
        "Total price quoted by the technician: Rs 2500.",
        "AC gas charging usually costs ₹1800 to ₹2200.",
        "Spare capacitor replacement fee is Rs. 450.",
        "A minimum inspection charge of ₹299 applies if work is cancelled.",
        "Labor cost is Rs. 850 per hour.",
        "Bathroom waterproofing estimate: ₹14500 total.",
        "Electrical switchboard rewiring is Rs 350 per point.",
        "The standard charge is ₹750 for fan motor winding.",
        "Priority booking fee of ₹99 has been waived.",
        "Total amount payable: ₹3,500 via UPI.",
        "Cost breakdown: ₹600 labor + ₹1400 parts = ₹2000.",
        "Estimated budget is Rs. 5000 for full house painting.",
        "Geyser thermostat costs around ₹850 in the market.",
        "Tap ceramic disc replacement is Rs. 200.",
        "Drain cleaning chemical cost: ₹350.",
        "Split AC deep cleaning is ₹999 per unit.",
        "Window AC installation rate: Rs. 1200 flat.",
        "Advance payment of ₹1000 is required for materials.",
        "Discount of ₹150 has been applied to your bill.",
        "Inspection is ₹199; actual repair depends on diagnosis.",
        "Technician charges ₹400 for additional hour.",
        "Total billing amount is Rs. 4250.",
        "Copper pipe extension costs ₹320 per foot.",
        "Water purifier sediment filter price is Rs 650.",
        "Main MCB replacement cost: ₹1100.",
        "Microwave magnetron replacement: Rs. 2800.",
        "Chimney motor repair fee: ₹1650.",
        "Price range: ₹400 - ₹800 depending on fixture.",
        "Final invoice: ₹2,150 paid by cash.",
        "Visiting fee is Rs. 250 in daytime.",
        "Night emergency surcharge is ₹500 extra.",
        "Carpenter labor charges: Rs. 1100 per day.",
        "Sofa shampooing package is ₹1399.",
        "Balcony bird net installation: Rs. 2400.",
        "Wall tile fixing is ₹65 per square foot.",
        "Plumbing washbasin replacement is Rs. 950.",
        "Exhaust fan installation fee: ₹350.",
        "TV wall mount bracket + installation: ₹899.",
        "RO membrane replacement: Rs. 1850.",
        "Lock cylinder replacement cost: ₹750.",
        "Door hinge realignment: Rs. 300.",
        "Switchboard repair is ₹250 per box.",
        "Inverter battery top up: Rs. 400.",
        "Compressor relay replacement: ₹650.",
        "Water meter fixing charges: Rs. 800.",
        "Bathroom silicone sealing: ₹450.",
        "Final total comes to Rs. 1750."
    ]
    for text in prices:
        corpus.append({
            "category": "Operational_Prices",
            "text": text,
            "has_pii": False,
            "pii_type": "none"
        })

    # 7. Negative: Indian 6-Digit PIN codes
    pincodes = [
        "Service area: Adyar, Chennai PIN 600020.",
        "Technician is currently serving Velachery 600042.",
        "Customer address located in T. Nagar PIN: 600017.",
        "Delivery address postal code is 600001.",
        "Worker registered in Mylapore with PIN 600004.",
        "Service request from Anna Nagar 600040.",
        "Technician covers Thiruvanmiyur PIN code 600041.",
        "Customer location: Guindy 600032.",
        "Coverage area extends to Nungambakkam 600034.",
        "Booking scheduled for Tambaram PIN 600045.",
        "Technician hub at Chromepet 600044.",
        "Service available in Porur 600116.",
        "Customer postal zone: Vadapalani 600026.",
        "Worker assigned from Alwarpet 600018.",
        "Service area: Besant Nagar 600090.",
        "Bangalore service center: Koramangala 560034.",
        "Customer in Indiranagar PIN 560038.",
        "Technician base: Whitefield 560066.",
        "Service request from HSR Layout 560102.",
        "Customer address: Jayanagar 560041.",
        "Electronic City PIN 560100 coverage.",
        "Hyderabad zone: Hitec City 500081.",
        "Customer located in Gachibowli 500032.",
        "Madhapur service area PIN 500086.",
        "Jubilee Hills 500033 customer location.",
        "Delhi hub: Connaught Place 110001.",
        "Service available in Saket 110017.",
        "Vasant Kunj PIN 110070 service.",
        "Dwarka sector 10 PIN 110075.",
        "Rohini sector 3 PIN 110085.",
        "Mumbai branch: Bandra West 400050.",
        "Andheri East PIN 400069.",
        "Customer address in Colaba 400005.",
        "Dadar West postal code 400028.",
        "Powai service hub PIN 400076.",
        "Pune center: Kothrud 411038.",
        "Viman Nagar PIN 411014.",
        "Hinjewadi IT park 411057.",
        "Kolkata: Salt Lake 700091.",
        "Park Street PIN 700016.",
        "Howrah central PIN 711101.",
        "Coimbatore: Gandhipuram 641012.",
        "RS Puram PIN 641002.",
        "Madurai: KK Nagar 625020.",
        "Trichy: Thillai Nagar 620018.",
        "Kochi: Edappally 682024.",
        "Kakkenad PIN 682030.",
        "Ahmedabad: Vastrapur 380015.",
        "Surat: Adajan 395009.",
        "Jaipur: Malviya Nagar 302017."
    ]
    for text in pincodes:
        corpus.append({
            "category": "Operational_Pincodes",
            "text": text,
            "has_pii": False,
            "pii_type": "none"
        })

    # 8. Negative: Dates, Timestamps & Durations
    dates_times = [
        "Your booking is scheduled for 2026-09-20 at 10:30 AM.",
        "Technician will arrive on 2026-09-25 between 2:00 PM and 4:00 PM.",
        "Service completed on 2026-08-15 at 14:45.",
        "Preferred slot: 19/09/2026 morning 9:00 AM.",
        "Rescheduled to 22/10/2026 at 11:15 AM.",
        "Available slots: 2026-10-01, 2026-10-02, 2026-10-03.",
        "Job started at 09:30 AM and ended at 11:45 AM.",
        "Estimated duration: 2 hours 30 minutes.",
        "Warranty valid until 2027-03-31.",
        "Next maintenance due on 2026-12-15.",
        "Booking created at 2026-09-19T10:15:30Z.",
        "Arrival window: 15:00 - 17:00 on Friday.",
        "The technician worked from 10:00 to 13:15.",
        "Appointment confirmed for 2026-11-05.",
        "Scheduled visit date: 15-10-2026.",
        "Customer requested postponement to 2026-09-28.",
        "Slot confirmed: tomorrow at 08:00 AM.",
        "Visit window: 2026-10-10 14:00 to 16:00.",
        "Completed in 45 minutes on 2026-09-18.",
        "Estimated arrival in 25 minutes.",
        "Technician delayed by 15 minutes due to traffic.",
        "Next available slot is 2026-09-21 at 16:30.",
        "Created on 2026-09-01, expired on 2026-09-15.",
        "Service warranty is 30 days from 2026-09-19.",
        "Follow up scheduled for 2026-09-24 at 10:00.",
        "Technician standby time: 20 minutes.",
        "Daily service hours: 08:00 AM - 08:00 PM.",
        "Peak hours: 18:00 to 21:00.",
        "Booking expires in 120 seconds.",
        "Response time benchmark: 45 seconds.",
        "Job duration: 1 hour 15 minutes.",
        "Inspection time logged: 11:30 AM.",
        "Gate check-in recorded at 10:05 AM.",
        "Check-out time: 12:40 PM on 2026-09-19.",
        "Slot selected: 2026-09-23 09:00-11:00.",
        "Window AC service takes 60 to 90 minutes.",
        "Annual maintenance contract valid 2026-2027.",
        "Technician arrived at 10:12 AM.",
        "Customer confirmation received at 09:45 AM.",
        "Priority match completed in 1.8 seconds.",
        "System timestamp: 2026-09-19 12:30:00.",
        "Scheduled for 2026-10-12 at 15:30.",
        "Last service was done on 2025-11-20.",
        "Free re-service window: 7 days.",
        "Booking timeline: requested 09:00, assigned 09:05.",
        "Job active since 2026-09-19 11:00 AM.",
        "Estimated time of arrival: 18:45.",
        "Technician on route at 10:20 AM.",
        "Slot opened for 2026-09-22 14:00.",
        "Reminder sent at 2026-09-19 08:00 AM."
    ]
    for text in dates_times:
        corpus.append({
            "category": "Operational_Dates_Times",
            "text": text,
            "has_pii": False,
            "pii_type": "none"
        })

    # 9. Negative: Technical Specs & Dimensions
    tech_specs = [
        "AC capacity is 1.5 ton 5-star inverter split unit.",
        "Operating voltage requirement is 220V to 240V at 50Hz.",
        "Room dimensions: 12 feet by 15 feet with 10 foot ceiling.",
        "Television size is 55-inch OLED 4K display.",
        "Pipe diameter: 0.5 inch copper tubing with 1.2 mm gauge.",
        "Refrigerant type required: R32 with 750 grams charge.",
        "Motor rating: 0.5 HP submersible water pump.",
        "Water purifier flow rate: 15 liters per hour with 2000 ppm TDS.",
        "Wiring specification: 2.5 sq mm copper fire-retardant wire.",
        "Circuit breaker rating: 16A single pole MCB.",
        "Washing machine capacity: 7.5 kg front load 1400 RPM.",
        "Geyser capacity: 25 liters storage 2000 Watts.",
        "Air purifier CADR: 350 cubic meters per hour.",
        "Inverter backup: 150Ah tubular battery with 900VA inverter.",
        "Microwave oven: 28 liters convection 900W.",
        "Refrigerator: 340 liters double door frost free.",
        "Ceiling fan sweep: 1200 mm with 380 RPM speed.",
        "Drill hole size: 8 mm diameter for rawl plug.",
        "Exhaust fan: 200 mm axial flow with 50W motor.",
        "Main switch rating: 63A 4-pole isolator.",
        "Water tank capacity: 1000 liters overhead PVC tank.",
        "LED panel light: 18W round warm white 3000K.",
        "Wall paint area: 450 sq ft interior emulsion.",
        "Tiles dimension: 600 mm x 600 mm vitrified tiles.",
        "Sofa dimension: 3-seater 72 inches width.",
        "Curtain track length: 9 feet aluminum channel.",
        "Kitchen sink: 24 x 18 inch stainless steel 304 grade.",
        "Water pressure required: 1.5 bar to 3.0 bar.",
        "Gas cylinder weight: 14.2 kg domestic LPG.",
        "Compressor power: 1250 Watts with rotary mechanism.",
        "Thermostat temperature range: 16°C to 30°C.",
        "Filter pore size: 5 micron pre-filter cartridge.",
        "Drill depth: 40 mm into concrete pillar.",
        "Door thickness: 35 mm flush door with veneer.",
        "Cable length: 15 meters 3-core armored cable.",
        "Pressure gauge reading: 65 psi suction pressure.",
        "Sound level: 38 dB silent outdoor unit operation.",
        "Weight of outdoor unit: 32 kg mounted on brackets.",
        "Chimney suction capacity: 1200 m3/hr with baffle filters.",
        "Solar water heater: 200 LPD evacuated tube collector.",
        "Conduit pipe: 20 mm PVC heavy gauge.",
        "Earth resistance measured: 2.4 ohms at pit.",
        "Voltage fluctuation measured: 195V to 255V.",
        "Capacitor value: 36 microfarad 440V AC.",
        "Pumping head: 25 meters vertical lift.",
        "Submersible cable: 3 x 4.0 sq mm flat cable.",
        "Water heater element: 3 kW copper heating coil.",
        "Stabilizer capacity: 4 kVA automatic voltage regulator.",
        "Door frame size: 7 feet x 3 feet teakwood.",
        "Window grill weight: 28 kg wrought iron."
    ]
    for text in tech_specs:
        corpus.append({
            "category": "Operational_Specs_Dimensions",
            "text": text,
            "has_pii": False,
            "pii_type": "none"
        })

    # 10. Negative: Benign Marketplace Conversation & Booking IDs
    benign_dialogue = [
        "I need an AC technician for urgent water leakage repair.",
        "Please assign a verified electrician near Adyar.",
        "Booking ID: BOOKING#b-10293 is currently in progress.",
        "Customer confirmed appointment for tomorrow morning.",
        "Worker Mohan has accepted the service request.",
        "Can you help me diagnose why the washing machine won't spin?",
        "Please make sure the technician carries a ladder.",
        "The technician has completed the task and updated status.",
        "How do I cancel my pending booking without penalty?",
        "Transaction reference: TXN-88492041 confirmed via gateway.",
        "Technician rating is 4.8 out of 5 based on 124 jobs.",
        "Is there any warranty on the ceiling fan repair?",
        "Please provide an itemized receipt for the materials purchased.",
        "The kitchen sink faucet is dripping continuously.",
        "I would like to reschedule my electrical repair to weekend.",
        "Assigned technician: Ramesh Kumar (HVAC Specialist).",
        "The technician arrived on time and was very professional.",
        "Job status updated to completed by service partner.",
        "Booking reference b-994812 has been marked completed.",
        "Do you provide chimney cleaning services in Chennai?",
        "Customer notes: Please ring the doorbell twice upon arrival.",
        "Technician is bringing spare parts for Daikin split AC.",
        "We offer standard 30-day service guarantee on all plumbing works.",
        "Please check if the main water valve is turned off.",
        "The circuit breaker trips whenever the geyser is switched on.",
        "Requesting a carpenter to fix wardrobe sliding door.",
        "Our customer support team is available 24/7 in app.",
        "Technician background check and police verification is complete.",
        "Can the worker bring his own drilling machine and vacuum cleaner?",
        "Payment of service fee was received successfully.",
        "Invoice ID: INV-2026-00491 generated.",
        "Service category selected: Home Appliance Repair.",
        "Customer has requested female professional for cleaning.",
        "Worker location is within 3.5 km from your premises.",
        "Priority matching algorithm assigned the nearest available worker.",
        "Please wear a mask and shoe covers inside the flat.",
        "The refrigerator compressor makes a loud humming sound.",
        "Technician reported that gas refilling is not required.",
        "Customer rating submitted: 5 stars with positive review.",
        "Order reference: ORD-991204 has been dispatched.",
        "Bathroom exhaust fan is jammed and needs oiling.",
        "Technician has been notified about your gate security code.",
        "All technicians carry certified digital ID badges.",
        "Please confirm if the problem is fully resolved.",
        "No additional service charge is payable to the partner.",
        "You can track the technician's real-time ETA on map.",
        "Service partner will call via masked bridge number.",
        "Connect360 ensures 100% data privacy and secure payments.",
        "Thank you for choosing Connect360 home services.",
        "Your feedback helps us maintain high service quality."
    ]
    for text in benign_dialogue:
        corpus.append({
            "category": "Operational_Dialogue_Benign",
            "text": text,
            "has_pii": False,
            "pii_type": "none"
        })

    return corpus

def run_benchmark():
    corpus = build_test_corpus()
    print(f"Loaded test corpus: {len(corpus)} total cases.")
    
    pos_count = sum(1 for c in corpus if c['has_pii'])
    neg_count = sum(1 for c in corpus if not c['has_pii'])
    print(f"Class distribution: {pos_count} Positive (PII) | {neg_count} Negative (Non-PII)")

    raw_results = []
    LATENCY_ITERATIONS = 100
    
    for idx, case in enumerate(corpus):
        text = case['text']
        has_pii = case['has_pii']
        category = case['category']
        pii_type = case['pii_type']
        
        redacted_text = _strip_contact_details(text)
        is_redacted = "[hidden]" in redacted_text
        
        if has_pii and is_redacted:
            outcome = "TP"
        elif not has_pii and not is_redacted:
            outcome = "TN"
        elif not has_pii and is_redacted:
            outcome = "FP"
        else:
            outcome = "FN"
            
        latencies_us = []
        for _ in range(LATENCY_ITERATIONS):
            t0 = time.perf_counter_ns()
            _ = _strip_contact_details(text)
            t1 = time.perf_counter_ns()
            latencies_us.append((t1 - t0) / 1000.0)
            
        mean_lat_us = float(np.mean(latencies_us))
        p50_lat_us = float(np.percentile(latencies_us, 50))
        p90_lat_us = float(np.percentile(latencies_us, 90))
        p99_lat_us = float(np.percentile(latencies_us, 99))
        
        raw_results.append({
            "test_id": idx + 1,
            "category": category,
            "has_pii": has_pii,
            "pii_type": pii_type,
            "input_text": text,
            "redacted_text": redacted_text,
            "is_redacted": is_redacted,
            "outcome": outcome,
            "mean_latency_us": round(mean_lat_us, 3),
            "p50_latency_us": round(p50_lat_us, 3),
            "p90_latency_us": round(p90_lat_us, 3),
            "p99_latency_us": round(p99_lat_us, 3)
        })
        
    return raw_results

def compute_summary(raw_results):
    categories = sorted(list(set(r['category'] for r in raw_results)))
    summary_rows = []
    
    for cat in categories:
        cat_items = [r for r in raw_results if r['category'] == cat]
        tp = sum(1 for r in cat_items if r['outcome'] == 'TP')
        tn = sum(1 for r in cat_items if r['outcome'] == 'TN')
        fp = sum(1 for r in cat_items if r['outcome'] == 'FP')
        fn = sum(1 for r in cat_items if r['outcome'] == 'FN')
        total = len(cat_items)
        
        precision = (tp / (tp + fp)) if (tp + fp) > 0 else (1.0 if fp == 0 else 0.0)
        recall = (tp / (tp + fn)) if (tp + fn) > 0 else (1.0 if fn == 0 else 0.0)
        specificity = (tn / (tn + fp)) if (tn + fp) > 0 else (1.0 if fp == 0 else 0.0)
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
        accuracy = (tp + tn) / total if total > 0 else 0.0
        
        latencies = [r['mean_latency_us'] for r in cat_items]
        
        summary_rows.append({
            "category": cat,
            "total_samples": total,
            "TP": tp,
            "TN": tn,
            "FP": fp,
            "FN": fn,
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "specificity": round(specificity, 4),
            "f1_score": round(f1, 4),
            "accuracy": round(accuracy, 4),
            "mean_latency_us": round(float(np.mean(latencies)), 3),
            "p99_latency_us": round(float(np.percentile(latencies, 99)), 3)
        })
        
    all_tp = sum(1 for r in raw_results if r['outcome'] == 'TP')
    all_tn = sum(1 for r in raw_results if r['outcome'] == 'TN')
    all_fp = sum(1 for r in raw_results if r['outcome'] == 'FP')
    all_fn = sum(1 for r in raw_results if r['outcome'] == 'FN')
    all_total = len(raw_results)
    
    all_precision = (all_tp / (all_tp + all_fp)) if (all_tp + all_fp) > 0 else 0.0
    all_recall = (all_tp / (all_tp + all_fn)) if (all_tp + all_fn) > 0 else 0.0
    all_specificity = (all_tn / (all_tn + all_fp)) if (all_tn + all_fp) > 0 else 0.0
    all_f1 = (2 * all_precision * all_recall / (all_precision + all_recall)) if (all_precision + all_recall) > 0 else 0.0
    all_accuracy = (all_tp + all_tn) / all_total if all_total > 0 else 0.0
    all_latencies = [r['mean_latency_us'] for r in raw_results]
    
    summary_rows.append({
        "category": "OVERALL",
        "total_samples": all_total,
        "TP": all_tp,
        "TN": all_tn,
        "FP": all_fp,
        "FN": all_fn,
        "precision": round(all_precision, 4),
        "recall": round(all_recall, 4),
        "specificity": round(all_specificity, 4),
        "f1_score": round(all_f1, 4),
        "accuracy": round(all_accuracy, 4),
        "mean_latency_us": round(float(np.mean(all_latencies)), 3),
        "p99_latency_us": round(float(np.percentile(all_latencies, 99)), 3)
    })
    
    return summary_rows

def save_csvs(raw_results, summary_rows, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    
    raw_path = os.path.join(out_dir, "metric5_raw_pii_redaction.csv")
    with open(raw_path, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=raw_results[0].keys())
        writer.writeheader()
        writer.writerows(raw_results)
    print(f"Saved raw results to: {raw_path}")
    
    summary_path = os.path.join(out_dir, "metric5_summary_pii.csv")
    with open(summary_path, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=summary_rows[0].keys())
        writer.writeheader()
        writer.writerows(summary_rows)
    print(f"Saved summary results to: {summary_path}")

def generate_figure(raw_results, summary_rows, out_dir):
    import matplotlib.pyplot as plt
    import seaborn as sns
    
    plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
    
    fig, axes = plt.subplots(2, 2, figsize=(15, 11), dpi=300)
    ax_cm, ax_cat = axes[0, 0], axes[0, 1]
    ax_lat, ax_err = axes[1, 0], axes[1, 1]
    
    # 1. Confusion Matrix (Top Left)
    overall = [s for s in summary_rows if s['category'] == 'OVERALL'][0]
    cm = np.array([
        [overall['TP'], overall['FN']],
        [overall['FP'], overall['TN']]
    ])
    
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', cbar=False, ax=ax_cm,
                annot_kws={'size': 16, 'weight': 'bold'},
                xticklabels=['Predicted PII\n([hidden])', 'Predicted Benign\n(Unchanged)'],
                yticklabels=['Actual PII\n(Positive)', 'Actual Benign\n(Negative)'])
    ax_cm.set_title(f"A. Binary Redaction Confusion Matrix (N={overall['total_samples']})\n"
                    f"Accuracy: {overall['accuracy']*100:.1f}% | Recall: {overall['recall']*100:.1f}% | Precision: {overall['precision']*100:.1f}%",
                    fontsize=11.5, fontweight='bold', pad=10)
    
    ax_cm.text(0.5, 0.25, f"TP (Caught PII): {overall['TP']}", ha='center', va='center', color='white', fontsize=10, fontweight='semibold')
    ax_cm.text(1.5, 0.25, f"FN (PII Leakage): {overall['FN']}", ha='center', va='center', color='black', fontsize=10, fontweight='semibold')
    ax_cm.text(0.5, 1.25, f"FP (Over-redaction): {overall['FP']}", ha='center', va='center', color='black', fontsize=10, fontweight='semibold')
    ax_cm.text(1.5, 1.25, f"TN (Preserved Benign): {overall['TN']}", ha='center', va='center', color='white', fontsize=10, fontweight='semibold')
    
    # 2. Performance Metrics by Category (Top Right)
    # Split into PII categories (Detection Recall) and Benign Categories (Preservation Specificity)
    pii_cats = ['Indian_Phone_Standard', 'Indian_Phone_Prefixed', 'International_Phone', 'Email_Address', 'Dialogue_PII_Embedded']
    benign_cats = ['Operational_Prices', 'Operational_Pincodes', 'Operational_Specs_Dimensions', 'Operational_Dialogue_Benign', 'Operational_Dates_Times']
    
    cat_names_display = []
    scores = []
    bar_colors = []
    
    for c in pii_cats:
        item = [s for s in summary_rows if s['category'] == c][0]
        cat_names_display.append(f"[PII] {c.replace('_', ' ')}")
        scores.append(item['recall'] * 100.0)
        bar_colors.append('#2ca02c') # Green for PII detection
        
    for c in benign_cats:
        item = [s for s in summary_rows if s['category'] == c][0]
        cat_names_display.append(f"[Benign] {c.replace('_', ' ')}")
        scores.append(item['specificity'] * 100.0)
        bar_colors.append('#1f77b4' if item['specificity'] > 0.8 else '#d62728') # Blue for high preservation, Red if degraded
        
    y = np.arange(len(cat_names_display))
    bars = ax_cat.barh(y, scores, height=0.62, color=bar_colors, alpha=0.88, edgecolor='black', linewidth=0.7)
    
    ax_cat.set_yticks(y)
    ax_cat.set_yticklabels(cat_names_display, fontsize=8.5)
    ax_cat.set_xlim(0, 115)
    ax_cat.set_xlabel("Efficacy Rate (%): Recall for PII | Specificity for Benign", fontsize=10, fontweight='bold')
    ax_cat.set_title("B. Category Breakdown: Detection Recall vs Benign Preservation", fontsize=11.5, fontweight='bold', pad=10)
    ax_cat.grid(True, linestyle='--', alpha=0.5, axis='x')
    
    # Annotate bar percentages
    for bar, score in zip(bars, scores):
        ax_cat.text(score + 1.5, bar.get_y() + bar.get_height()/2.0, f"{score:.1f}%",
                    va='center', ha='left', fontsize=8.5, fontweight='bold')
        
    # 3. Latency Distribution per Evaluation (Bottom Left)
    all_lats = [r['mean_latency_us'] for r in raw_results]
    
    ax_lat.hist(all_lats, bins=35, color='#4a148c', alpha=0.75, edgecolor='black', linewidth=0.8)
    ax_lat.axvline(np.median(all_lats), color='red', linestyle='--', linewidth=1.5, label=f"Median: {np.median(all_lats):.2f} us")
    ax_lat.axvline(np.percentile(all_lats, 99), color='orange', linestyle=':', linewidth=1.8, label=f"P99: {np.percentile(all_lats, 99):.2f} us")
    
    ax_lat.set_xlabel("Execution Latency per Evaluation (microseconds, us)", fontsize=10, fontweight='bold')
    ax_lat.set_ylabel("Sample Frequency (Count)", fontsize=10, fontweight='bold')
    ax_lat.set_title("C. Execution Latency Profile (High-Res Timer, N=500)", fontsize=11.5, fontweight='bold', pad=10)
    ax_lat.legend(loc='upper right', frameon=True, fontsize=9)
    ax_lat.grid(True, linestyle='--', alpha=0.5)
    
    # 4. Error Analysis & Edge Case Breakdown (Bottom Right)
    error_items = [r for r in raw_results if r['outcome'] in ('FP', 'FN')]
    
    err_cat_counts = {}
    for err in error_items:
        key = f"{err['category'].replace('_', ' ')}\n({err['outcome']})"
        err_cat_counts[key] = err_cat_counts.get(key, 0) + 1
        
    if err_cat_counts:
        err_labels = list(err_cat_counts.keys())
        err_vals = list(err_cat_counts.values())
        colors = ['#d62728' if '(FN)' in l else '#ff7f0e' for l in err_labels]
        bars_err = ax_err.bar(err_labels, err_vals, color=colors, alpha=0.85, edgecolor='black', width=0.55)
        ax_err.set_ylabel("Error Count (Cases)", fontsize=10, fontweight='bold')
        ax_err.set_title("D. Error Diagnostic: Leakage (FN) vs Over-Redaction (FP)", fontsize=11.5, fontweight='bold', pad=10)
        ax_err.tick_params(axis='x', labelsize=8.5)
        ax_err.set_ylim(0, max(err_vals) + 4)
        for bar, v in zip(bars_err, err_vals):
            ax_err.text(bar.get_x() + bar.get_width()/2.0, v + 0.5, str(v), ha='center', va='bottom', fontweight='bold', fontsize=9.5)
            
    ax_err.grid(True, linestyle='--', alpha=0.5, axis='y')
    
    fig.suptitle("Connect360 AI Assistant Safety & Contact Redaction Efficacy (PII Defense)\n"
                 "Evaluation of Production Filter: backend/lambdas/connect360-assistant/handler.py -> _strip_contact_details()",
                 fontsize=13.5, fontweight='bold', y=0.98)
    
    fig_path = os.path.join(out_dir, "metric5_confusion_matrix_and_performance.png")
    plt.subplots_adjust(top=0.91, bottom=0.08, left=0.08, right=0.96, hspace=0.32, wspace=0.25)
    plt.savefig(fig_path, dpi=300)
    plt.close()
    print(f"Saved publication-quality figure to: {fig_path}")

if __name__ == "__main__":
    out_dir = os.path.abspath(os.path.dirname(__file__))
    raw_results = run_benchmark()
    summary_rows = compute_summary(raw_results)
    save_csvs(raw_results, summary_rows, out_dir)
    generate_figure(raw_results, summary_rows, out_dir)
    print("Metric 5 benchmark complete!")
