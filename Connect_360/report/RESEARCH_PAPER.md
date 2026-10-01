# CONNECT360: AN INTELLIGENT AND SECURE PLATFORM FOR SKILLED LABOUR BOOKING

**DIVYA M**  
Associate Professor  
Department of Computer Science and Engineering  
ponmani.m@rajalakshmi.edu.in  
Rajalakshmi Engineering College, Chennai, Tamil Nadu  

**DHARSHINI R S** (230701076@rajalakshmi.edu.in)  
**ENIYA B A** (230701085@rajalakshmi.edu.in)  
**JAYADHARSINI M** (230701354@rajalakshmi.edu.in)  
**JAYAPRADHA P** (230701130@rajalakshmi.edu.in)  
Department of Computer Science and Engineering, Rajalakshmi Engineering College, Chennai, Tamil Nadu  

---

## Abstract
Finding trusted skilled service workers remains a significant problem in the informal home-services space. Customers are usually reliant on private referrals or manual searches to find suitable workers for a specific service that meet their skills, availability, experience, trust, and distance requirements. Skilled workers, on the other hand, have few opportunities for digital exposure of their abilities and do not have access to a robust platform to handle requests and build credibility. The situation becomes even more challenging for urgent service requests, requiring identifying an appropriate worker within a short period.

This paper proposes the Connect360 smart worker matching algorithm and a context-aware platform that offers skilled worker discovery, worker verification, service finding, Scheduled Booking, and Priority Booking. Connect360 CSWMA (Connect360 Smart Worker Matching Algorithm) ranks potential candidates in accordance with different factors with varied weights depending on the request type, including Scheduled Booking and Priority Booking. The proposed approach introduces automatic rematching for Priority Booking and road-based worker tracking alongside a role-aware conversational assistant for service booking. In addition, the paper implements a system that secures worker verification documents and offers role-based access control. The proposed solution is evaluated using AWS serverless infrastructure to measure matching latency, ranking sensitivity, transactional concurrency, spatial routing, and PII redaction experiments. The results demonstrate the ability of the context-aware platform to enable worker discovery and booking in a secure serverless home-service environment.

**Key words**— Skilled service workers, home services, worker matching, context-aware recommendation, Priority Booking, worker verification, serverless computing, artificial intelligence, CSWMA.

---

## I. INTRODUCTION
The proliferation of digital service platforms has transformed the ways in which customers search and access services. Nevertheless, the problem of finding an appropriate skilled service worker for home-service needs such as electrical, plumbing, carpentry, cleaning, or equipment maintenance still persists. Unlike products, the process of choosing a service worker requires considering a number of factors. For example, in addition to the service scope, a customer may want to take into account the worker’s skills, availability, experience, reliability, reputation, verification status, and proximity. Since a worker may be available but located far from the customer’s residence or provide high-quality service but be unwilling to work at a specific time, choosing the most suitable worker based on multiple criteria is critical. As can be seen, the task of picking up a home-service worker based on the provided service description and personal preferences involves a complex multifactorial decision-making process.

As the informal home-services market poses a significant challenge to both customers and service workers, it is necessary to address it through a comprehensive solution. In the current situation, where customers resort to word-of-mouth, local networks, and Google search to find a worker, a multifactorial recommendation system would help sort service providers according to customers’ individual preferences. At the same time, since informal workers do not have a strong digital presence, a recommendation system would allow skilled workers to advertise their services and attract clients by showcasing their qualifications, working conditions, and other characteristics. Overall, the abovementioned considerations contribute to the necessity of building such a system, which would enable both buyers and sellers of home-services in local networks to communicate, share information, and conduct transactions more efficiently.

The problem becomes more complicated when service requirements are different in terms of urgency. For a Scheduled Booking, the customers will have enough time to evaluate the suitability, trust, experience, availability, reliability, and distance of a worker before making a decision. However, for a Priority Booking, the allocation process should be more time-critical since the worker’s availability and proximity to the service location are significant factors. Therefore, a worker may be suitable for a certain planned service, but at the same time, he may be unavailable or located too far from the customer’s location to provide an immediate service. Thus, a home-service marketplace should consider different booking contexts to maintain service suitability and trust.

This paper proposes Connect360, the serverless home-services marketplace, which connects customers with skilled service workers through a central platform. It offers role-based workflows for customers, workers, and administrators. With a customer’s interface, one can search for trusted workers, check their skills, experience, availability, and perform a Scheduled or Priority Booking. Using the worker’s interface, they can manage their professional account, check customers’ requests, accept or deny booking requests, update booking status, and upload documents for verification. Administrators are responsible for managing workers and service categories, reviewing workers’ documents, and storing booking-related information. Connect360 uses AWS serverless infrastructure to ensure the safety of customer data and provide a solid foundation for service management.

In this regard, the Connect360 platform uses a Connect360 Smart Worker Matching Algorithm (CSWMA) to rank the appropriate worker using various attributes related to service and worker. Since scheduled services and priority services have unique needs, different weighing techniques are used for Scheduled and Priority Booking so that the process of ranking can take into account the unique needs of these two types of services. Apart from worker matching, Connect360 also offers worker verification, auto rematching for Priority Booking, booking control to prevent double booking, and road-based live tracking for active Priority Bookings. It uses a role-aware conversational assistant based on Google Gemini to give service interaction that is structured and multilingual, with rule-based fallback. Furthermore, the platform handles the process of worker verification securely using private storage and access control for the documents along with role-based authentication and authorization.

For customer to worker communication, the existing implementation provides calling via device's native dialer from active bookings.

This paper’s significant contributions include:
1. A serverless skilled home-service platform involving customers, skilled workers, and administrators.
2. The Connect360 Smart Worker Matching Algorithm (CSWMA) that ranks workers on the basis of contextual information.
3. Different weighting schemes used in Scheduled and Priority Booking modes.
4. Priority Booking transactions where server-side availability validation, slot locking, and re-matching is performed to minimize booking conflicts and address cases where workers reject or are unavailable for the booking.
5. An evaluation framework that measures performance in terms of matching time delay, ranking sensitivity, transactional concurrency, routing, and PII redaction.

---

## II. LITERATURE REVIEW
The related literature falls under local service-provider recommendation, service recommendation, skill-based matching, spatial worker allocation, trust-aware recommendation, artificial intelligence, and cloud-based service systems. Each of the research directions focuses on distinct aspects of recommending appropriate service providers to users. The literature considers service requirements, worker capabilities, user preferences, trust, location, and task constraints, providing the foundation for developing a skilled home-service booking platform. To find an appropriate local service provider, customers often need to assess the capabilities and reliability of the workers before they request services.

---

## III. METHODOLOGY
The methodology adopted for Connect360 is modular serverless, incorporating user authentication, worker verification, recommendation, booking management, AI assistance, and admin monitoring components. It is developed using three major user roles (customer, worker, administrator) and AWS managed services.

### CSWMA Scoring Equations
For Scheduled Booking:
$$SN = 0.30M + 0.25T + 0.15E + 0.15A + 0.10R + 0.05D$$

For Priority Booking:
$$SP = 0.20M + 0.15T + 0.05E + 0.30A + 0.05R + 0.25D$$

---

## IV. RESULTS AND ANALYSIS
Connect360 system was tested according to six experimental criteria:
1. Matching Engine Latency
2. Rank Sensitivity of Dual Weighting System
3. Transactional Concurrency & Race Prevention (0% double bookings over 9,400 requests)
4. Spatial Routing Assessment (Haversine vs OSRM road distance)
5. AI Safety & PII Redaction Evaluation (99.20% recall)
6. Structured Output JSON Schema Conformity (100% schema accuracy)

---

## V. CONCLUSION
Connect360 demonstrates that a serverless architecture is capable of unifying intelligent functions in a home-services marketplace, including worker matching, concurrency resolution, spatial routing, conversational assistance, and privacy-preserving communication layers.
