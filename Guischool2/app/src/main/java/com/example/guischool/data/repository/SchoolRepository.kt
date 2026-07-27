package com.example.guischool.data.repository

import com.example.guischool.data.model.*
import kotlinx.coroutines.delay
import java.util.UUID

/**
 * Repository for school data
 * Handles all data operations for the school parent app
 */
class SchoolRepository private constructor() {

    companion object {
        @Volatile
        private var instance: SchoolRepository? = null

        fun getInstance(): SchoolRepository {
            return instance ?: synchronized(this) {
                instance ?: SchoolRepository().also { instance = it }
            }
        }
    }

    /**
     * Login with phone number
     */
    suspend fun login(phoneNumber: String) {
        delay(500) // Simulate network delay
        // In production, this would call the API
    }

    /**
     * Verify OTP code
     */
    suspend fun verifyOTP(otp: String): Result<AuthState> {
        delay(500) // Simulate network delay

        // Mock successful response
        val authState = AuthState(
            isLoggedIn = true,
            phoneNumber = "+224612345678",
            parentId = "parent_001",
            children = listOf(
                Student(
                    id = "student_001",
                    firstName = "Alpha",
                    lastName = "Diallo",
                    dateOfBirth = "2015-03-12",
                    gender = Gender.MALE,
                    schoolName = "École Primaire Internationale de Conakry",
                    className = "CM2",
                    level = "Primary",
                    matricule = "EPI-2024-001",
                    mainTeacher = "Mme. Fatou Barry"
                ),
                Student(
                    id = "student_002",
                    firstName = "Mariama",
                    lastName = "Diallo",
                    dateOfBirth = "2018-09-25",
                    gender = Gender.FEMALE,
                    schoolName = "École Primaire Internationale de Conakry",
                    className = "CP",
                    level = "Primary",
                    matricule = "EPI-2024-002",
                    mainTeacher = "M. Mohamed Soumah"
                )
            ),
            selectedChildId = "student_001"
        )

        return Result.success(authState)
    }

    /**
     * Logout
     */
    suspend fun logout() {
        delay(200)
        // Clear session
    }

    /**
     * Get grades for a student
     */
    suspend fun getGrades(studentId: String): List<Subject> {
        delay(300)

        return listOf(
            Subject(
                id = "subj_001",
                name = "Mathématiques",
                coefficient = 4,
                grades = listOf(
                    Grade(
                        id = "grade_001",
                        studentId = studentId,
                        subjectName = "Mathématiques",
                        coefficient = 4,
                        value = 16.5,
                        maxValue = 20.0,
                        type = GradeType.DS,
                        date = "2025-01-15",
                        period = "Trimestre 1",
                        comment = "Excellent travail",
                        createdAt = "2025-01-15T10:30:00",
                        updatedAt = null,
                        deletedAt = null,
                        deleted = false,
                        deletedBy = null,
                        deletedReason = null
                    ),
                    Grade(
                        id = "grade_002",
                        studentId = studentId,
                        subjectName = "Mathématiques",
                        coefficient = 4,
                        value = 14.0,
                        maxValue = 20.0,
                        type = GradeType.CC,
                        date = "2025-01-20",
                        period = "Trimestre 1",
                        comment = null,
                        createdAt = "2025-01-20T09:00:00",
                        updatedAt = null,
                        deletedAt = null,
                        deleted = false,
                        deletedBy = null,
                        deletedReason = null
                    )
                )
            ),
            Subject(
                id = "subj_002",
                name = "Français",
                coefficient = 4,
                grades = listOf(
                    Grade(
                        id = "grade_003",
                        studentId = studentId,
                        subjectName = "Français",
                        coefficient = 4,
                        value = 15.0,
                        maxValue = 20.0,
                        type = GradeType.DS,
                        date = "2025-01-16",
                        period = "Trimestre 1",
                        comment = "Bon effort",
                        createdAt = "2025-01-16T11:00:00",
                        updatedAt = null,
                        deletedAt = null,
                        deleted = false,
                        deletedBy = null,
                        deletedReason = null
                    )
                )
            ),
            Subject(
                id = "subj_003",
                name = "Anglais",
                coefficient = 2,
                grades = listOf(
                    Grade(
                        id = "grade_004",
                        studentId = studentId,
                        subjectName = "Anglais",
                        coefficient = 2,
                        value = 12.0,
                        maxValue = 20.0,
                        type = GradeType.CC,
                        date = "2025-01-18",
                        period = "Trimestre 1",
                        comment = "À améliorer",
                        createdAt = "2025-01-18T08:30:00",
                        updatedAt = null,
                        deletedAt = null,
                        deleted = false,
                        deletedBy = null,
                        deletedReason = null
                    )
                )
            ),
            Subject(
                id = "subj_004",
                name = "Sciences",
                coefficient = 3,
                grades = listOf(
                    Grade(
                        id = "grade_005",
                        studentId = studentId,
                        subjectName = "Sciences",
                        coefficient = 3,
                        value = 14.5,
                        maxValue = 20.0,
                        type = GradeType.DS,
                        date = "2025-01-19",
                        period = "Trimestre 1",
                        comment = "Très bien",
                        createdAt = "2025-01-19T10:00:00",
                        updatedAt = null,
                        deletedAt = null,
                        deleted = false,
                        deletedBy = null,
                        deletedReason = null
                    )
                )
            ),
            Subject(
                id = "subj_005",
                name = "Histoire-Géographie",
                coefficient = 2,
                grades = listOf(
                    Grade(
                        id = "grade_006",
                        studentId = studentId,
                        subjectName = "Histoire-Géographie",
                        coefficient = 2,
                        value = 13.0,
                        maxValue = 20.0,
                        type = GradeType.CC,
                        date = "2025-01-21",
                        period = "Trimestre 1",
                        comment = null,
                        createdAt = "2025-01-21T09:30:00",
                        updatedAt = null,
                        deletedAt = null,
                        deleted = false,
                        deletedBy = null,
                        deletedReason = null
                    )
                )
            )
        )
    }

    /**
     * Get absences for a student
     */
    suspend fun getAbsences(studentId: String): List<Absence> {
        delay(300)

        return listOf(
            Absence(
                id = "abs_001",
                studentId = studentId,
                date = "2025-01-10",
                subject = "Mathématiques",
                status = AbsenceStatus.ABSENT_JUSTIFIED,
                justification = "Maladie - Certificat médical",
                justifiedBy = "Parent",
                createdAt = "2025-01-10T08:30:00"
            ),
            Absence(
                id = "abs_002",
                studentId = studentId,
                date = "2025-01-22",
                subject = "Français",
                status = AbsenceStatus.ABSENT,
                createdAt = "2025-01-22T08:30:00"
            ),
            Absence(
                id = "abs_003",
                studentId = studentId,
                date = "2025-01-25",
                subject = "Anglais",
                status = AbsenceStatus.LATE,
                minutesLate = 15,
                createdAt = "2025-01-25T08:45:00"
            )
        )
    }

    /**
     * Get fees for a student
     */
    suspend fun getFees(studentId: String): List<Fee> {
        delay(300)

        return listOf(
            Fee(
                id = "fee_001",
                studentId = studentId,
                name = "Scolarite - Trimestre 2",
                totalAmount = 1500000.0,
                paidAmount = 1500000.0,
                dueDate = "2025-01-31",
                category = "Scolarité",
                status = FeeStatus.PAID
            ),
            Fee(
                id = "fee_002",
                studentId = studentId,
                name = "Scolarite - Trimestre 3",
                totalAmount = 1500000.0,
                paidAmount = 500000.0,
                dueDate = "2025-04-30",
                category = "Scolarité",
                status = FeeStatus.PARTIALLY_PAID
            ),
            Fee(
                id = "fee_003",
                studentId = studentId,
                name = "Cantine - Mars 2025",
                totalAmount = 150000.0,
                paidAmount = 0.0,
                dueDate = "2025-03-05",
                category = "Cantine",
                status = FeeStatus.PENDING
            ),
            Fee(
                id = "fee_004",
                studentId = studentId,
                name = "Transport - Trimestre 3",
                totalAmount = 600000.0,
                paidAmount = 0.0,
                dueDate = "2025-04-30",
                category = "Transport",
                status = FeeStatus.PENDING
            )
        )
    }

    /**
     * Get payment history for a student
     */
    suspend fun getPaymentHistory(studentId: String): List<Payment> {
        delay(300)

        return listOf(
            Payment(
                id = "pay_001",
                studentId = studentId,
                amount = 1500000.0,
                paymentDate = "2025-01-15",
                method = PaymentMethod.WAVE,
                status = PaymentStatus.COMPLETED,
                reference = "WAVE-2025-001",
                category = "Scolarité",
                period = "Trimestre 2",
                createdAt = "2025-01-15T14:30:00"
            ),
            Payment(
                id = "pay_002",
                studentId = studentId,
                amount = 200000.0,
                paymentDate = "2025-01-20",
                method = PaymentMethod.ORANGE_MONEY,
                status = PaymentStatus.COMPLETED,
                reference = "OM-2025-002",
                category = "Inscription",
                createdAt = "2025-01-20T10:15:00"
            ),
            Payment(
                id = "pay_003",
                studentId = studentId,
                amount = 500000.0,
                paymentDate = "2025-03-01",
                method = PaymentMethod.MTN_MONEY,
                status = PaymentStatus.COMPLETED,
                reference = "MTN-2025-003",
                category = "Scolarité",
                period = "Trimestre 3",
                createdAt = "2025-03-01T09:00:00"
            )
        )
    }

    /**
     * Get timetable for a student
     */
    suspend fun getTimetable(studentId: String): List<TimetableSlot> {
        delay(300)

        return listOf(
            // Monday
            TimetableSlot(
                id = "slot_001",
                className = "CM2",
                subject = "Mathématiques",
                teacherName = "M. Ahmed Sylla",
                dayOfWeek = 1,
                startTime = "08:00",
                endTime = "09:00",
                room = "Salle 1"
            ),
            TimetableSlot(
                id = "slot_002",
                className = "CM2",
                subject = "Français",
                teacherName = "Mme. Fatou Barry",
                dayOfWeek = 1,
                startTime = "09:00",
                endTime = "10:00",
                room = "Salle 2"
            ),
            // Tuesday
            TimetableSlot(
                id = "slot_003",
                className = "CM2",
                subject = "Anglais",
                teacherName = "Mr. John Smith",
                dayOfWeek = 2,
                startTime = "08:00",
                endTime = "09:00",
                room = "Salle 3"
            ),
            TimetableSlot(
                id = "slot_004",
                className = "CM2",
                subject = "Sciences",
                teacherName = "Mme. Aïda Camara",
                dayOfWeek = 2,
                startTime = "10:00",
                endTime = "11:00",
                room = "Labo Sciences"
            ),
            // Wednesday
            TimetableSlot(
                id = "slot_005",
                className = "CM2",
                subject = "Histoire-Géographie",
                teacherName = "M. Mohamed Soumah",
                dayOfWeek = 3,
                startTime = "08:00",
                endTime = "09:00",
                room = "Salle 1"
            ),
            TimetableSlot(
                id = "slot_006",
                className = "CM2",
                subject = "Mathématiques",
                teacherName = "M. Ahmed Sylla",
                dayOfWeek = 3,
                startTime = "09:00",
                endTime = "10:00",
                room = "Salle 1"
            ),
            // Thursday
            TimetableSlot(
                id = "slot_007",
                className = "CM2",
                subject = "Français",
                teacherName = "Mme. Fatou Barry",
                dayOfWeek = 4,
                startTime = "08:00",
                endTime = "09:00",
                room = "Salle 2"
            ),
            TimetableSlot(
                id = "slot_008",
                className = "CM2",
                subject = "Éducation Artistique",
                teacherName = "Mme. Marie Doumbouya",
                dayOfWeek = 4,
                startTime = "10:00",
                endTime = "11:00",
                room = "Atelier"
            ),
            // Friday
            TimetableSlot(
                id = "slot_009",
                className = "CM2",
                subject = "Sciences",
                teacherName = "Mme. Aïda Camara",
                dayOfWeek = 5,
                startTime = "08:00",
                endTime = "09:00",
                room = "Labo Sciences"
            ),
            TimetableSlot(
                id = "slot_010",
                className = "CM2",
                subject = "Sport",
                teacherName = "M. Guillaume Bernard",
                dayOfWeek = 5,
                startTime = "10:00",
                endTime = "11:00",
                room = "Terrain"
            )
        )
    }

    /**
     * Get messages
     */
    suspend fun getMessages(): List<Message> {
        delay(300)

        return listOf(
            Message(
                id = "msg_001",
                senderId = "school_001",
                senderName = "École EPI Conakry",
                senderType = SenderType.SCHOOL,
                title = "Réunion parents-profs",
                content = "Chers parents, nous vous informons qu'une réunion parents-professeurs se tiendra le samedi 15 mars 2025 à 9h00 dans la salle polyvalente de l'école.",
                timestamp = "2025-03-01T10:00:00",
                isRead = false
            ),
            Message(
                id = "msg_002",
                senderId = "teacher_001",
                senderName = "Mme. Fatou Barry",
                senderType = SenderType.TEACHER,
                recipientId = "student_001",
                recipientName = "Alpha Diallo",
                title = "Devoirs de la semaine",
                content = "Bonjour,\n\nVoici les devoirs pour ce week-end:\n- Mathématiques: Exercices 1 à 5 page 45\n- Français: Rédaction sur le thème 'Mes vacances'\n\nBonne continuation!",
                timestamp = "2025-02-28T16:30:00",
                isRead = true
            ),
            Message(
                id = "msg_003",
                senderId = "director_001",
                senderName = "M. le Directeur",
                senderType = SenderType.DIRECTOR,
                title = "Inscription année scolaire 2025-2026",
                content = "Chers parents, les inscriptions pour l'année scolaire 2025-2026 sont désormais ouvertes. Veuillez procéder au paiement des frais d'inscription auprès du secrétariat.",
                timestamp = "2025-02-20T09:00:00",
                isRead = true
            )
        )
    }

    /**
     * Get notifications
     */
    suspend fun getNotifications(): List<Notification> {
        delay(300)

        return listOf(
            Notification(
                id = "notif_001",
                title = "Nouveau bulletin disponible",
                content = "Le bulletin du trimestre 1 est désormais disponible. Veuillez le consulter dans la section Notes.",
                type = NotificationType.GRADE,
                timestamp = "2025-02-01T14:00:00",
                isRead = false
            ),
            Notification(
                id = "notif_002",
                title = "Absence enregistrée",
                content = "Une absence a été enregistrée pour votre enfant le 22 janvier 2025 en Français.",
                type = NotificationType.ABSENCE,
                timestamp = "2025-01-22T08:35:00",
                isRead = false
            ),
            Notification(
                id = "notif_003",
                title = "Paiement reçu",
                content = "Nous avons reçu votre paiement de 500 000 GNF pour le trimestre 3.",
                type = NotificationType.PAYMENT,
                timestamp = "2025-03-01T09:05:00",
                isRead = true
            ),
            Notification(
                id = "notif_004",
                title = "Message de l'école",
                content = "Vous avez reçu un nouveau message de l'école.",
                type = NotificationType.MESSAGE,
                timestamp = "2025-03-01T10:00:00",
                isRead = false
            ),
            Notification(
                id = "notif_005",
                title = "Journée portes ouvertes",
                content = "L'école organise une journée portes ouvertes le 20 avril 2025. Nous vous y attendons nombreux!",
                type = NotificationType.GENERAL,
                timestamp = "2025-02-25T11:00:00",
                isRead = true
            )
        )
    }

    /**
     * Submit justification for an absence
     */
    suspend fun submitJustification(absenceId: String, justification: String): Result<Unit> {
        delay(500)

        // In production, this would call the API
        return Result.success(Unit)
    }

    /**
     * Initiate mobile money payment
     */
    suspend fun initiateMobileMoneyPayment(
        studentId: String,
        amount: Double,
        method: PaymentMethod
    ): Result<String> {
        delay(500)

        // Generate a mock transaction reference
        val transactionRef = when (method) {
            PaymentMethod.ORANGE_MONEY -> "OM-${UUID.randomUUID().toString().take(8)}"
            PaymentMethod.MTN_MONEY -> "MTN-${UUID.randomUUID().toString().take(8)}"
            PaymentMethod.WAVE -> "WAVE-${UUID.randomUUID().toString().take(8)}"
            else -> return Result.failure(IllegalArgumentException("Méthode de paiement non supportée"))
        }

        return Result.success(transactionRef)
    }

    /**
     * Confirm payment after mobile money confirmation
     */
    suspend fun confirmPayment(transactionRef: String): Result<Payment> {
        delay(500)

        // Mock successful payment confirmation
        val payment = Payment(
            id = UUID.randomUUID().toString(),
            studentId = "student_001",
            amount = 500000.0,
            paymentDate = "2025-03-01",
            method = PaymentMethod.WAVE,
            status = PaymentStatus.COMPLETED,
            reference = transactionRef,
            category = "Scolarité",
            period = "Trimestre 3",
            createdAt = "2025-03-01T09:00:00"
        )

        return Result.success(payment)
    }

    /**
     * Send a message to the school
     */
    suspend fun sendMessage(studentId: String?, content: String, title: String): Result<Unit> {
        delay(500)

        // In production, this would call the API
        return Result.success(Unit)
    }

    /**
     * Mark message as read
     */
    suspend fun markMessageAsRead(messageId: String) {
        delay(200)
        // In production, this would call the API
    }

    /**
     * Mark notification as read
     */
    suspend fun markNotificationAsRead(notificationId: String) {
        delay(200)
        // In production, this would call the API
    }
}