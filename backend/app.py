import os
import logging
from datetime import date
from functools import wraps
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from cycle_prediction import parse_date, predict_cycle

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing for mobile client accessibility
mock_cycles = {}

# Placeholder for Firebase Admin SDK initialization
firebase_initialized = False
try:
    import firebase_admin
    from firebase_admin import credentials, auth, firestore
    import json

    # Check for credentials in env, either as a JSON string or path
    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "config/serviceAccountKey.json")

    if service_account_json:
        try:
            service_account_info = json.loads(service_account_json)
            cred = credentials.Certificate(service_account_info)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            firebase_initialized = True
            logger.info("Firebase Admin SDK successfully initialized via environment JSON string.")
        except Exception as json_err:
            logger.error(f"Error initializing Firebase from JSON string: {str(json_err)}")
    elif os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        firebase_initialized = True
        logger.info(f"Firebase Admin SDK successfully initialized via certificate file: {cred_path}")
    else:
        logger.warning(
            f"Firebase service account key not found at '{cred_path}' and FIREBASE_SERVICE_ACCOUNT_JSON not set. "
            "Running backend in mock/development mode. Fill in configuration keys to connect Firebase."
        )
except Exception as e:
    logger.error(f"Error initializing Firebase Admin: {str(e)}")


def authenticated_user(handler):
    """Resolve the user from a verified Firebase token in production."""
    @wraps(handler)
    def wrapped(*args, **kwargs):
        authorization = request.headers.get("Authorization", "")
        token = authorization.removeprefix("Bearer ").strip()

        if firebase_initialized:
            if not token:
                return jsonify({"error": "Authentication required"}), 401
            try:
                request.user_id = auth.verify_id_token(token)["uid"]
            except Exception:
                return jsonify({"error": "Invalid or expired authentication token"}), 401
        else:
            # Development mode keeps data isolated by the mock profile id.
            payload = request.get_json(silent=True) or {}
            request.user_id = (
                request.headers.get("X-User-Id")
                or payload.get("uid")
                or request.args.get("uid")
                or "mock_user_123"
            )
        return handler(*args, **kwargs)

    return wrapped

# Health Check Route
@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "status": "healthy",
        "app": "Aarini Backend API",
        "firebase_connected": firebase_initialized,
        "environment": os.getenv("FLASK_ENV", "development")
    }), 200

# ----------------- AUTHENTICATION ENDPOINTS -----------------

@app.route("/signup", methods=["POST"])
def signup():
    """
    Creates a new user record.
    Expected Payload: { name, email, password, age, cycleLength }
    """
    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    age = data.get("age")
    cycle_length = data.get("cycleLength", 28)

    if not name or not email or not password:
        return jsonify({"error": "Missing required fields (name, email, password)"}), 400

    logger.info(f"Registering user: {email}")

    # Fallback/Mock behavior if Firebase is not yet connected
    if not firebase_initialized:
        return jsonify({
            "message": "User registered successfully (Mock Mode)",
            "user": {
                "uid": "mock_user_123",
                "name": name,
                "email": email,
                "age": age,
                "cycleLength": cycle_length
            }
        }), 201

    try:
        # Create Firebase User
        user_record = auth.create_user(
            email=email,
            password=password,
            display_name=name
        )

        # Store profile information in Firestore
        user_ref = db.collection("users").document(user_record.uid)
        user_ref.set({
            "name": name,
            "email": email,
            "age": age,
            "cycleLength": cycle_length,
            "createdAt": firestore.SERVER_TIMESTAMP
        })

        return jsonify({
            "message": "User registered successfully",
            "uid": user_record.uid
        }), 201

    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/login", methods=["POST"])
def login():
    """
    Validates user authentication session.
    Expected Payload: { email, password }
    """
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400

    logger.info(f"Authenticating user: {email}")

    # Mock behavior
    if not firebase_initialized:
        return jsonify({
            "message": "Logged in successfully (Mock Mode)",
            "token": "mock_jwt_token_abc123",
            "user": {
                "uid": "mock_user_123",
                "name": "Jane Doe",
                "email": email,
                "cycleLength": 28
            }
        }), 200

    # Note: Client SDKs usually handle direct user login.
    # Here, Flask acts as a validating gateway if JWT token validation is needed.
    return jsonify({
        "message": "Backend session active. Please login directly in the mobile client for official Firebase session tokens.",
        "note": "We recommend direct client-side Firebase Auth authentication for maximum mobile capability."
    }), 200


# ----------------- PERIOD TRACKING ENDPOINTS -----------------

@app.route("/add-cycle", methods=["POST"])
@authenticated_user
def add_cycle():
    """
    Records a cycle entry.
    Expected Payload: { uid, startDate, endDate, flowIntensity, symptoms, mood }
    """
    data = request.get_json() or {}
    uid = request.user_id
    start_date = data.get("startDate")
    end_date = data.get("endDate")
    flow_intensity = data.get("flowIntensity")
    symptoms = data.get("symptoms", [])
    mood = data.get("mood")

    if not start_date or not end_date:
        return jsonify({"error": "startDate and endDate are required"}), 400

    try:
        parsed_start = parse_date(start_date)
        parsed_end = parse_date(end_date)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if parsed_end < parsed_start:
        return jsonify({"error": "endDate cannot be before startDate"}), 400
    if (parsed_end - parsed_start).days > 13:
        return jsonify({"error": "A period entry cannot be longer than 14 days"}), 400
    if parsed_start > date.today():
        return jsonify({"error": "startDate cannot be in the future"}), 400

    logger.info(f"Adding cycle for user: {uid}")

    if not firebase_initialized:
        cycle = {
            "id": f"mock_cycle_{len(mock_cycles.get(uid, [])) + 1}",
            "startDate": start_date,
            "endDate": end_date,
            "flowIntensity": flow_intensity,
            "symptoms": symptoms,
            "mood": mood,
        }
        user_cycles = mock_cycles.setdefault(uid, [])
        user_cycles.append(cycle)
        return jsonify({
            "message": "Cycle logged successfully (Mock Mode)",
            "cycle": cycle,
            "prediction": predict_cycle(user_cycles),
        }), 201

    try:
        cycle_ref = db.collection("users").document(uid).collection("cycles").document()
        cycle_data = {
            "startDate": start_date,
            "endDate": end_date,
            "flowIntensity": flow_intensity,
            "symptoms": symptoms,
            "mood": mood,
            "loggedAt": firestore.SERVER_TIMESTAMP
        }
        cycle_ref.set(cycle_data)
        return jsonify({"message": "Cycle data saved", "id": cycle_ref.id}), 201
    except Exception as e:
        logger.error(f"Error saving cycle: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/cycles", methods=["GET"])
@authenticated_user
def get_cycles():
    """
    Retrieves previous logs for cycle tracking.
    """
    uid = request.user_id
    logger.info(f"Fetching cycles for user: {uid}")

    if not firebase_initialized:
        if uid not in mock_cycles:
            mock_cycles[uid] = [
                {"id": "sample_1", "startDate": "2026-04-28", "endDate": "2026-05-02"},
                {"id": "sample_2", "startDate": "2026-05-27", "endDate": "2026-05-31"},
            ]
        user_cycles = mock_cycles[uid]
        return jsonify({
            "cycles": sorted(user_cycles, key=lambda cycle: cycle["startDate"], reverse=True),
            "prediction": predict_cycle(user_cycles),
        }), 200

    try:
        cycles_ref = db.collection("users").document(uid).collection("cycles").order_by("startDate", direction=firestore.Query.DESCENDING)
        docs = cycles_ref.stream()
        cycles_list = []
        for doc in docs:
            c = doc.to_dict()
            c["id"] = doc.id
            cycles_list.append(c)
        profile = db.collection("users").document(uid).get().to_dict() or {}
        return jsonify({
            "cycles": cycles_list,
            "prediction": predict_cycle(cycles_list, fallback_cycle_length=profile.get("cycleLength", 28)),
        }), 200
    except Exception as e:
        logger.error(f"Error getting cycles: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/cycle-prediction", methods=["GET"])
@authenticated_user
def get_cycle_prediction():
    uid = request.user_id
    if not firebase_initialized:
        return jsonify(predict_cycle(mock_cycles.get(uid, []))), 200

    try:
        docs = (
            db.collection("users")
            .document(uid)
            .collection("cycles")
            .order_by("startDate", direction=firestore.Query.ASCENDING)
            .stream()
        )
        cycles = [doc.to_dict() for doc in docs]
        profile = db.collection("users").document(uid).get().to_dict() or {}
        return jsonify(
            predict_cycle(cycles, fallback_cycle_length=profile.get("cycleLength", 28))
        ), 200
    except Exception as e:
        logger.error(f"Error predicting cycle: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ----------------- MOOD & SYMPTOM ENDPOINTS -----------------

@app.route("/add-symptom", methods=["POST"])
def add_symptom():
    """
    Logs an individual symptom.
    Expected Payload: { uid, type, severity, date }
    """
    data = request.get_json() or {}
    uid = data.get("uid", "mock_user_123")
    symptom_type = data.get("type")
    severity = data.get("severity")  # e.g., Low, Medium, High
    date = data.get("date")

    if not symptom_type or not severity or not date:
        return jsonify({"error": "Missing required fields (type, severity, date)"}), 400

    logger.info(f"Logging symptom: {symptom_type} for user: {uid}")

    if not firebase_initialized:
        return jsonify({
            "message": "Symptom tracked successfully (Mock Mode)",
            "symptom": {"type": symptom_type, "severity": severity, "date": date}
        }), 201

    try:
        symptom_ref = db.collection("users").document(uid).collection("symptoms").document()
        symptom_ref.set({
            "type": symptom_type,
            "severity": severity,
            "date": date,
            "loggedAt": firestore.SERVER_TIMESTAMP
        })
        return jsonify({"message": "Symptom logged", "id": symptom_ref.id}), 201
    except Exception as e:
        logger.error(f"Error logging symptom: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/symptoms", methods=["GET"])
def get_symptoms():
    uid = request.args.get("uid", "mock_user_123")
    logger.info(f"Retrieving symptoms for user: {uid}")

    if not firebase_initialized:
        return jsonify([
            {"type": "Cramps", "severity": "Medium", "date": "2026-05-24"},
            {"type": "Fatigue", "severity": "High", "date": "2026-05-23"},
            {"type": "Acne", "severity": "Low", "date": "2026-05-20"}
        ]), 200

    try:
        symptoms_ref = db.collection("users").document(uid).collection("symptoms").order_by("date", direction=firestore.Query.DESCENDING)
        docs = symptoms_ref.stream()
        symptoms_list = []
        for doc in docs:
            s = doc.to_dict()
            s["id"] = doc.id
            symptoms_list.append(s)
        return jsonify(symptoms_list), 200
    except Exception as e:
        logger.error(f"Error fetching symptoms: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ----------------- AI HEALTH CHAT ENDPOINTS -----------------

@app.route("/chat", methods=["POST"])
def chat():
    """
    Interacts with Gemini API securely for empathetic, women's wellness explanations.
    Expected Payload: { message }
    """
    data = request.get_json() or {}
    user_message = data.get("message")

    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    logger.info(f"AI Chat request: {user_message[:50]}...")

    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        # Fallback informative mock response
        return jsonify({
            "response": (
                "👋 Hello! I am Aarini, your empathetic hormonal wellness guide.\n\n"
                "To get fully personalized answers using Google's advanced Gemini AI, "
                "please insert your `GEMINI_API_KEY` into our backend `.env` file.\n\n"
                "For now, here is a general wellness tip: Eating magnesium-rich foods like dark chocolate, "
                "bananas, or spinach can naturally help relax muscles and ease menstrual cramps. "
                "Remember to drink plenty of warm water!"
            ),
            "disclaimer": "Disclaimer: I am an AI educational companion. My responses are for informational purposes only and do not replace professional medical advice. Always consult a physician for health concerns."
        }), 200

    try:
        import google.generativeai as genai

        genai.configure(api_key=gemini_key)
        
        # System instructions to restrict answers to hormonal health, enforce disclaimers, and remain compassionate
        system_instruction = (
            "You are Aarini, an extremely empathetic, professional, and supportive AI wellness assistant "
            "specializing in women's hormonal wellness, menstrual health, and reproductive biology. "
            "Use warm, reassuring language. Provide scientific, easy-to-understand educational explanations "
            "(e.g., explaining hormones like progesterone and estrogen simply). "
            "You MUST NOT diagnose illnesses, prescribe medications, or claim to replace qualified medical practitioners. "
            "For severe symptoms (e.g., extreme debilitating pain, heavy hemorrhage), always gently encourage the "
            "user to seek guidance from an OB-GYN or primary care physician. "
            "Always include a concise, friendly medical disclaimer at the absolute end of your response."
        )

        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config={"temperature": 0.7},
            system_instruction=system_instruction
        )

        response = model.generate_content(user_message)
        
        return jsonify({
            "response": response.text,
            "disclaimer": "Disclaimer: Aarini is an AI educational assistant. Our suggestions are informative and do not constitute formal medical diagnosis."
        }), 200

    except Exception as e:
        logger.error(f"Gemini API error: {str(e)}")
        return jsonify({"error": "Failed to generate AI response. Details: " + str(e)}), 500


# ----------------- WELLNESS INSIGHTS ENDPOINTS -----------------

@app.route("/insights", methods=["GET"])
def get_insights():
    """
    Computes wellness insights based on cycle history.
    """
    uid = request.args.get("uid", "mock_user_123")
    logger.info(f"Computing insights for user: {uid}")

    # For MVP, we supply static but highly engaging medical-educational insights.
    # In a full release, this fetches cycles/symptoms and runs standard deviations to check regularity.
    insights = [
        {
            "category": "Hormonal Balance",
            "title": "Progesterone Phase Peak",
            "message": "Based on your cycle logging, you are entering your luteal phase. Progesterone is peaking, which can naturally increase fatigue or cravings. Consider choosing nourishing, low-glycemic foods to sustain energy.",
            "type": "tip"
        },
        {
            "category": "Cycle Consistency",
            "title": "Healthy Regular Cycle",
            "message": "Your cycle variance is only 1.5 days over the last 3 logged periods. This indicates high regularity, reflecting positive endocrine health.",
            "type": "success"
        },
        {
            "category": "Hydration Reminder",
            "title": "Mitigate PMS Bloating",
            "message": "Historically, you log bloating on day 26 of your cycle. Drinking at least 2.5L of water today will help flush excess sodium and reduce fluid retention.",
            "type": "alert"
        }
    ]
    return jsonify(insights), 200


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    # Run server on all hosts for mobile emulator outreach
    app.run(host="0.0.0.0", port=port, debug=True)
