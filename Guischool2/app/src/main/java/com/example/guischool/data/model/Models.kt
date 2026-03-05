package com.example.guischool.data.model

import java.util.UUID

/**
 * Represents a student in the system
 */
data class Student(
    val id: String = UUID.randomUUID().toString(),
    val firstName: String,
    val lastName: String,
    val dateOfBirth: String,
    val gender: Gender,
    val photoUrl: String? = null,
    val schoolName: String,
    val className: String,
    val level: String,
    val matricule: String,
    val mainTeacher: String? = null,
    val schoolYear: String = "2025-2026"
)

enum class Gender {
    MALE, FEMALE
}

/**
 * Represents a parent/guardian linked to students
 */
data class Parent(
    val id: String = UUID.randomUUID().toString(),
    val phoneNumber: String,
    val firstName: String,
    val lastName: String,
    val email: String? = null,
    val children: List<String> = emptyList() // Student IDs
)

/**
 * Represents a grade/evaluation result
 */
data class Grade(
    val id: String = UUID.randomUUID().toString(),
    val studentId: String,
    val subjectName: String,
    val coefficient: Int,
    val value: Double,
    val maxValue: Double = 20.0,
    val type: GradeType,
    val date: String,
    val period: String, // "Trimestre 1", "Trimestre 2", "Trimestre 3"
    val comment: String? = null,
    val createdAt: String,
    val updatedAt: String? = null,
    val deletedAt: String? = null,
    val deleted: Boolean = false,
    val deletedBy: String? = null,
    val deletedReason: String? = null
)

enum class GradeType {
    CC, // Contrôle Continu
    DS, // Devoir Surveillé
    TP, // Travaux Pratiques
    PARTICIPATION,
    ORAL
}

/**
 * Represents a subject with grades summary
 */
data class Subject(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val coefficient: Int,
    val grades: List<Grade> = emptyList()
) {
    val average: Double
        get() = if (grades.isEmpty()) 0.0 else grades.map { it.value }.average()
}

/**
 * Represents an absence record
 */
data class Absence(
    val id: String = UUID.randomUUID().toString(),
    val studentId: String,
    val date: String,
    val subject: String? = null,
    val status: AbsenceStatus,
    val minutesLate: Int? = null,
    val justification: String? = null,
    val justifiedBy: String? = null,
    val createdAt: String
)

enum class AbsenceStatus {
    PRESENT,
    ABSENT,
    ABSENT_JUSTIFIED,
    LATE,
    EXCLUDED
}

/**
 * Represents a payment record
 */
data class Payment(
    val id: String = UUID.randomUUID().toString(),
    val studentId: String,
    val amount: Double,
    val currency: String = "GNF",
    val paymentDate: String,
    val dueDate: String? = null,
    val method: PaymentMethod,
    val status: PaymentStatus,
    val reference: String? = null,
    val category: String, // "Scolarité", "Inscription", "Cantine", etc.
    val period: String? = null, // "Septembre", "Trimestre 1", etc.
    val receiptUrl: String? = null,
    val createdAt: String
)

enum class PaymentMethod {
    CASH,
    ORANGE_MONEY,
    MTN_MONEY,
    WAVE,
    BANK_TRANSFER,
    CHECK
}

enum class PaymentStatus {
    PENDING,
    COMPLETED,
    FAILED,
    CANCELLED
}

/**
 * Represents a fee/debt for a student
 */
data class Fee(
    val id: String = UUID.randomUUID().toString(),
    val studentId: String,
    val name: String,
    val totalAmount: Double,
    val paidAmount: Double = 0.0,
    val dueDate: String? = null,
    val category: String,
    val status: FeeStatus = FeeStatus.PENDING
) {
    val remainingAmount: Double
        get() = totalAmount - paidAmount
    
    val isPaid: Boolean
        get() = paidAmount >= totalAmount
}

enum class FeeStatus {
    PAID,
    PENDING,
    OVERDUE,
    PARTIALLY_PAID
}

/**
 * Represents a message/communication
 */
data class Message(
    val id: String = UUID.randomUUID().toString(),
    val studentId: String? = null, // Can be null for broadcast messages
    val senderId: String,
    val senderName: String,
    val senderType: SenderType,
    val recipientId: String? = null,
    val recipientName: String? = null,
    val title: String,
    val content: String,
    val timestamp: String,
    val isRead: Boolean = false,
    val attachments: List<String> = emptyList(),
    val priority: Priority = Priority.MEDIUM,  // ← AJOUTEZ CECI
    val attachmentCount: Int = 0,              // ← ET CECI si besoin
    val isArchived: Boolean = false
)

enum class SenderType {
    SCHOOL,
    TEACHER,
    DIRECTOR,
    ADMIN,
    PARENT,

}

/**
 * Represents a notification
 */
data class Notification(
    val id: String = UUID.randomUUID().toString(),
    val studentId: String? = null,
    val title: String,
    val content: String,
    val type: NotificationType,
    val timestamp: String,
    val isRead: Boolean = false,
    val actionUrl: String? = null
)

enum class NotificationType {
    GRADE,
    ABSENCE,
    PAYMENT,
    MESSAGE,
    GENERAL,
    URGENT
}

/**
 * Represents a school/class timetable slot
 */
data class TimetableSlot(
    val id: String = UUID.randomUUID().toString(),
    val className: String,
    val subject: String,
    val teacherName: String,
    val dayOfWeek: Int, // 1 = Monday, 7 = Sunday
    val startTime: String,
    val endTime: String,
    val room: String? = null
)

/**
 * User authentication state
 */
data class AuthState(
    val isLoggedIn: Boolean = false,
    val phoneNumber: String? = null,
    val parentId: String? = null,
    val children: List<Student> = emptyList(),
    val selectedChildId: String? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

/**
 * App settings
 */
data class AppSettings(
    val language: String = "fr", // "fr", "en", "pular", "susu", "maninka"
    val notificationsEnabled: Boolean = true,
    val smsEnabled: Boolean = true,
    val pushEnabled: Boolean = true,
    val offlineMode: Boolean = false
)

enum class Priority {
    LOW,
    MEDIUM,
    HIGH,

}

