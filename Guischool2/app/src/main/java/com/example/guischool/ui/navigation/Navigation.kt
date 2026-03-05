package com.example.guischool.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.guischool.data.model.PaymentMethod
import com.example.guischool.ui.MainViewModel
import com.example.guischool.ui.PaymentState
import com.example.guischool.ui.screens.absences.AbsencesScreen
import com.example.guischool.ui.screens.auth.LoginScreen
import com.example.guischool.ui.screens.auth.OTPScreen
import com.example.guischool.ui.screens.grades.GradesScreen
import com.example.guischool.ui.screens.home.HomeScreen
import com.example.guischool.ui.screens.messages.MessagesScreen
import com.example.guischool.ui.screens.payments.PaymentsScreen
import com.example.guischool.ui.screens.settings.SettingsScreen
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Navigation destinations
 */
sealed class Screen(val route: String) {
    data object Login : Screen("login")
    data object Home : Screen("home")
    data object Grades : Screen("grades")
    data object Absences : Screen("absences")
    data object Payments : Screen("payments")
    data object Messages : Screen("messages")
    data object Settings : Screen("settings")
}

/**
 * Main navigation composable
 */
@Composable
fun AppNavigation(
    viewModel: MainViewModel = viewModel()
) {
    val authState by viewModel.authState.collectAsState()
    val children by viewModel.children.collectAsState()
    val selectedChild by viewModel.selectedChild.collectAsState()
    val grades by viewModel.grades.collectAsState()
    val absences by viewModel.absences.collectAsState()
    val fees by viewModel.fees.collectAsState()
    val payments by viewModel.payments.collectAsState()
    val messages by viewModel.messages.collectAsState()
    val notifications by viewModel.notifications.collectAsState()
    val settings by viewModel.settings.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()
    val paymentState by viewModel.paymentState.collectAsState()
    
    // Navigation state
    var currentScreen by remember { mutableStateOf<Screen>(Screen.Login) }
    var showOTPScreen by remember { mutableStateOf(false) }
    var pendingPhoneNumber by remember { mutableStateOf("") }
    
    // Coroutine scope for async operations
    val scope = CoroutineScope(Dispatchers.Main)
    
    // Load messages and notifications on first login
    if (authState.isLoggedIn) {
        scope.launch {
            viewModel.loadMessages()
            viewModel.loadNotifications()
        }
    }
    
    when (currentScreen) {
        Screen.Login -> {
            if (showOTPScreen) {
                OTPScreen(
                    phoneNumber = pendingPhoneNumber,
                    onVerifyOTP = { otp ->
                        scope.launch {
                            viewModel.verifyOTP(otp)
                        }
                    },
                    onResendOTP = {
                        scope.launch {
                            viewModel.login(pendingPhoneNumber) {}
                        }
                    },
                    onChangePhone = {
                        showOTPScreen = false
                        pendingPhoneNumber = ""
                    },
                    isLoading = isLoading
                )
            } else {
                LoginScreen(
                    onLoginSuccess = {
                        scope.launch {
                            viewModel.verifyOTP("123456") // Mock OTP for demo
                        }
                    },
                    onRequestOTP = { phone ->
                        pendingPhoneNumber = phone
                        showOTPScreen = true
                        scope.launch {
                            viewModel.login(phone) {}
                        }
                    },
                    isLoading = isLoading,
                    error = error
                )
            }
            
            // Auto-navigate to home if already logged in (mock)
            if (authState.isLoggedIn) {
                currentScreen = Screen.Home
                showOTPScreen = false
            }
        }
        
        Screen.Home -> {
            HomeScreen(
                children = children,
                selectedChild = selectedChild,
                grades = grades,
                absences = absences,
                fees = fees,
                notifications = notifications,
                onSelectChild = { childId -> viewModel.selectChild(childId) },
                onNavigateToGrades = { currentScreen = Screen.Grades },
                onNavigateToAbsences = { currentScreen = Screen.Absences },
                onNavigateToPayments = { currentScreen = Screen.Payments },
                onNavigateToMessages = { currentScreen = Screen.Messages },
                onNavigateToSettings = { currentScreen = Screen.Settings },
                onLogout = {
                    scope.launch {
                        viewModel.logout()
                    }
                    currentScreen = Screen.Login
                }
            )
        }
        
        Screen.Grades -> {
            GradesScreen(
                student = selectedChild,
                grades = grades,
                onBackClick = { currentScreen = Screen.Home }
            )
        }
        
        Screen.Absences -> {
            AbsencesScreen(
                student = selectedChild,
                absences = absences,
                onBackClick = { currentScreen = Screen.Home },
                onJustifyAbsence = { absenceId, justification ->
                    scope.launch {
                        viewModel.submitJustification(absenceId, justification)
                    }
                }
            )
        }
        
        Screen.Payments -> {
            PaymentsScreen(
                student = selectedChild,
                fees = fees,
                payments = payments,
                paymentState = paymentState,
                onBackClick = { currentScreen = Screen.Home },
                onInitiatePayment = { amount, method ->
                    scope.launch {
                        viewModel.initiatePayment(amount, method)
                    }
                },
                onConfirmPayment = { transactionRef ->
                    scope.launch {
                        viewModel.confirmPayment(transactionRef)
                    }
                },
                onCancelPayment = {
                    viewModel.cancelPayment()
                }
            )
        }
        
        Screen.Messages -> {
            MessagesScreen(
                messages = messages,
                onBackClick = { currentScreen = Screen.Home },
                onSendMessage = { title, content ->
                    scope.launch {
                        viewModel.sendMessage(content, title)
                    }
                },
                onMessageClick = { messageId ->
                    scope.launch {
                        viewModel.markMessageAsRead(messageId)
                    }
                }
            )
        }
        
        Screen.Settings -> {
            SettingsScreen(
                settings = settings,
                onBackClick = { currentScreen = Screen.Home },
                onSettingsChange = { newSettings -> viewModel.updateSettings(newSettings) },
                onLogout = {
                    scope.launch {
                        viewModel.logout()
                    }
                    currentScreen = Screen.Login
                }
            )
        }
    }
}
