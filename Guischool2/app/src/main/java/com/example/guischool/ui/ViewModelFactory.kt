package com.example.guischool.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.example.guischool.data.model.*
import com.example.guischool.data.repository.SchoolRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Main ViewModel for the parent application
 * Manages authentication state, selected child, and all school data
 */
class MainViewModel(
    private val repository: SchoolRepository = SchoolRepository.getInstance()
) : ViewModel() {
    
    // Authentication state
    private val _authState = MutableStateFlow(AuthState())
    val authState: StateFlow<AuthState> = _authState.asStateFlow()
    
    // Children (students)
    private val _children = MutableStateFlow<List<Student>>(emptyList())
    val children: StateFlow<List<Student>> = _children.asStateFlow()
    
    // Currently selected child
    private val _selectedChild = MutableStateFlow<Student?>(null)
    val selectedChild: StateFlow<Student?> = _selectedChild.asStateFlow()
    
    // Grades for selected child
    private val _grades = MutableStateFlow<List<Subject>>(emptyList())
    val grades: StateFlow<List<Subject>> = _grades.asStateFlow()
    
    // Absences for selected child
    private val _absences = MutableStateFlow<List<Absence>>(emptyList())
    val absences: StateFlow<List<Absence>> = _absences.asStateFlow()
    
    // Fees for selected child
    private val _fees = MutableStateFlow<List<Fee>>(emptyList())
    val fees: StateFlow<List<Fee>> = _fees.asStateFlow()
    
    // Payments for selected child
    private val _payments = MutableStateFlow<List<Payment>>(emptyList())
    val payments: StateFlow<List<Payment>> = _payments.asStateFlow()
    
    // Messages
    private val _messages = MutableStateFlow<List<Message>>(emptyList())
    val messages: StateFlow<List<Message>> = _messages.asStateFlow()
    
    // Notifications
    private val _notifications = MutableStateFlow<List<Notification>>(emptyList())
    val notifications: StateFlow<List<Notification>> = _notifications.asStateFlow()
    
    // Timetable
    private val _timetable = MutableStateFlow<List<TimetableSlot>>(emptyList())
    val timetable: StateFlow<List<TimetableSlot>> = _timetable.asStateFlow()
    
    // App settings
    private val _settings = MutableStateFlow(AppSettings())
    val settings: StateFlow<AppSettings> = _settings.asStateFlow()
    
    // Loading states
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    // Error state
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    // Payment processing state
    private val _paymentState = MutableStateFlow<PaymentState>(PaymentState.Idle)
    val paymentState: StateFlow<PaymentState> = _paymentState.asStateFlow()
    
    private val scope = CoroutineScope(Dispatchers.Main)
    
    /**
     * Login with phone number
     */
    fun login(phoneNumber: String, onOTPRequired: () -> Unit) {
        _isLoading.value = true
        _error.value = null
        
        scope.launch {
            try {
                repository.login(phoneNumber)
                _authState.value = _authState.value.copy(
                    isLoading = false,
                    phoneNumber = phoneNumber
                )
                _isLoading.value = false
                // Trigger OTP screen to show
                onOTPRequired()
            } catch (e: Exception) {
                _error.value = "Erreur de connexion: ${e.message}"
                _authState.value = _authState.value.copy(isLoading = false)
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Verify OTP code
     */
    fun verifyOTP(otp: String) {
        _isLoading.value = true
        _error.value = null
        
        scope.launch {
            try {
                val result = repository.verifyOTP(otp)
                result.fold(
                    onSuccess = { authState ->
                        _authState.value = authState.copy(isLoading = false)
                        _children.value = authState.children
                        if (authState.children.isNotEmpty()) {
                            selectChild(authState.children.first().id)
                        }
                    },
                    onFailure = { e ->
                        _error.value = "Code OTP invalide"
                        _authState.value = _authState.value.copy(isLoading = false)
                    }
                )
            } catch (e: Exception) {
                _error.value = "Erreur de vérification: ${e.message}"
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Logout
     */
    fun logout() {
        _isLoading.value = true
        scope.launch {
            try {
                repository.logout()
                resetState()
            } catch (e: Exception) {
                _error.value = "Erreur de déconnexion"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Select a child to view their details
     */
    fun selectChild(childId: String) {
        val child = _children.value.find { it.id == childId }
        _selectedChild.value = child
        _authState.value = _authState.value.copy(selectedChildId = childId)
        
        // Load data for selected child
        scope.launch {
            loadChildData(childId)
        }
    }
    
    /**
     * Load all data for a specific child
     */
    private suspend fun loadChildData(childId: String) {
        _isLoading.value = true
        try {
            _grades.value = repository.getGrades(childId)
            _absences.value = repository.getAbsences(childId)
            _fees.value = repository.getFees(childId)
            _payments.value = repository.getPaymentHistory(childId)
            _timetable.value = repository.getTimetable(childId)
        } catch (e: Exception) {
            _error.value = "Erreur de chargement des données"
        } finally {
            _isLoading.value = false
        }
    }
    
    /**
     * Load messages
     */
    fun loadMessages() {
        scope.launch {
            try {
                _messages.value = repository.getMessages()
            } catch (e: Exception) {
                _error.value = "Erreur de chargement des messages"
            }
        }
    }
    
    /**
     * Load notifications
     */
    fun loadNotifications() {
        scope.launch {
            try {
                _notifications.value = repository.getNotifications()
            } catch (e: Exception) {
                _error.value = "Erreur de chargement des notifications"
            }
        }
    }
    
    /**
     * Submit justification for an absence
     */
    fun submitJustification(absenceId: String, justification: String) {
        _isLoading.value = true
        scope.launch {
            try {
                val result = repository.submitJustification(absenceId, justification)
                if (result.isSuccess) {
                    _selectedChild.value?.let { loadChildData(it.id) }
                } else {
                    _error.value = "Erreur lors de la soumission"
                }
            } catch (e: Exception) {
                _error.value = "Erreur: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Initiate mobile money payment
     */
    fun initiatePayment(amount: Double, method: PaymentMethod) {
        val childId = _selectedChild.value?.id ?: return
        
        _paymentState.value = PaymentState.Processing
        _isLoading.value = true
        
        scope.launch {
            try {
                val result = repository.initiateMobileMoneyPayment(childId, amount, method)
                result.fold(
                    onSuccess = { transactionRef ->
                        _paymentState.value = PaymentState.AwaitingConfirmation(transactionRef)
                    },
                    onFailure = { e ->
                        _paymentState.value = PaymentState.Error(e.message ?: "Erreur de paiement")
                    }
                )
            } catch (e: Exception) {
                _paymentState.value = PaymentState.Error(e.message ?: "Erreur")
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Confirm payment after mobile money confirmation
     */
    fun confirmPayment(transactionRef: String) {
        _paymentState.value = PaymentState.Processing
        _isLoading.value = true
        
        scope.launch {
            try {
                val result = repository.confirmPayment(transactionRef)
                result.fold(
                    onSuccess = { payment ->
                        _payments.value = listOf(payment) + _payments.value
                        _paymentState.value = PaymentState.Success(payment)
                        
                        // Reload fees
                        _selectedChild.value?.let { loadChildData(it.id) }
                    },
                    onFailure = { e ->
                        _paymentState.value = PaymentState.Error(e.message ?: "Erreur de confirmation")
                    }
                )
            } catch (e: Exception) {
                _paymentState.value = PaymentState.Error(e.message ?: "Erreur")
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Cancel payment
     */
    fun cancelPayment() {
        _paymentState.value = PaymentState.Idle
    }
    
    /**
     * Send a message to the school
     */
    fun sendMessage(content: String, title: String) {
        _isLoading.value = true
        scope.launch {
            try {
                val result = repository.sendMessage(_selectedChild.value?.id, content, title)
                if (result.isSuccess) {
                    loadMessages()
                } else {
                    _error.value = "Erreur d'envoi du message"
                }
            } catch (e: Exception) {
                _error.value = "Erreur: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Mark message as read
     */
    fun markMessageAsRead(messageId: String) {
        scope.launch {
            try {
                repository.markMessageAsRead(messageId)
                _messages.value = _messages.value.map {
                    if (it.id == messageId) it.copy(isRead = true) else it
                }
            } catch (e: Exception) {
                // Silent fail
            }
        }
    }
    
    /**
     * Mark notification as read
     */
    fun markNotificationAsRead(notificationId: String) {
        scope.launch {
            try {
                repository.markNotificationAsRead(notificationId)
                _notifications.value = _notifications.value.map {
                    if (it.id == notificationId) it.copy(isRead = true) else it
                }
            } catch (e: Exception) {
                // Silent fail
            }
        }
    }
    
    /**
     * Update app settings
     */
    fun updateSettings(newSettings: AppSettings) {
        _settings.value = newSettings
    }
    
    /**
     * Clear error
     */
    fun clearError() {
        _error.value = null
    }
    
    /**
     * Reset all state on logout
     */
    private fun resetState() {
        _authState.value = AuthState()
        _children.value = emptyList()
        _selectedChild.value = null
        _grades.value = emptyList()
        _absences.value = emptyList()
        _fees.value = emptyList()
        _payments.value = emptyList()
        _messages.value = emptyList()
        _notifications.value = emptyList()
        _timetable.value = emptyList()
    }
    
    // Calculate overall average for selected child
    fun getOverallAverage(): Double {
        val subjects = _grades.value
        if (subjects.isEmpty()) return 0.0
        
        var totalWeightedScore = 0.0
        var totalCoefficients = 0
        
        for (subject in subjects) {
            if (subject.grades.isNotEmpty()) {
                totalWeightedScore += subject.average * subject.coefficient
                totalCoefficients += subject.coefficient
            }
        }
        
        return if (totalCoefficients > 0) totalWeightedScore / totalCoefficients else 0.0
    }
    
    // Get total amount due
    fun getTotalDue(): Double {
        return _fees.value
            .filter { !it.isPaid }
            .sumOf { it.remainingAmount }
    }
    
    // Get unread messages count
    fun getUnreadMessagesCount(): Int {
        return _messages.value.count { !it.isRead }
    }
    
    // Get unread notifications count
    fun getUnreadNotificationsCount(): Int {
        return _notifications.value.count { !it.isRead }
    }
}

/**
 * Payment state sealed class
 */
sealed class PaymentState {
    data object Idle : PaymentState()
    data object Processing : PaymentState()
    data class AwaitingConfirmation(val transactionRef: String) : PaymentState()
    data class Success(val payment: Payment) : PaymentState()
    data class Error(val message: String) : PaymentState()
}

/**
 * ViewModel factory
 */
class MainViewModelFactory : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(MainViewModel::class.java)) {
            return MainViewModel() as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
