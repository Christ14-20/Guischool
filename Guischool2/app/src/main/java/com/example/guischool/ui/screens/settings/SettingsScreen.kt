package com.example.guischool.ui.screens.settings

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.guischool.data.model.AppSettings

/**
 * Settings screen with modern, organic design inspired by Guinean aesthetics
 * Featuring earth tones, vegetable green accents, and fluid animations
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    settings: AppSettings,
    onBackClick: () -> Unit,
    onSettingsChange: (AppSettings) -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showLanguageDialog by remember { mutableStateOf(false) }
    var showLogoutDialog by remember { mutableStateOf(false) }

    val languages = listOf(
        Language("fr", "Français", "Français"),
        Language("en", "English", "Anglais"),
        Language("pular", "Pular", "Peul"),
        Language("susu", "Susu", "Soussou"),
        Language("maninka", "Maninka", "Malinké")
    )

    val currentLanguage = languages.find { it.code == settings.language } ?: languages[0]

    // Custom color palette inspired by Guinean landscape
    val ForestGreen = Color(0xFF2D5016)
    val EarthBrown = Color(0xFF8B4513)
    val SandBeige = Color(0xFFF5F5DC)
    val SunsetOrange = Color(0xFFE07B39)

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Paramètres",
                        style = MaterialTheme.typography.headlineSmall.copy(
                            fontWeight = FontWeight.Bold
                        )
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            Icons.Default.ArrowBack,
                            contentDescription = "Retour",
                            tint = MaterialTheme.colorScheme.onPrimary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = ForestGreen,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        },
        containerColor = SandBeige.copy(alpha = 0.3f)
    ) { paddingValues ->
        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            // Profile/Account Header
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            brush = Brush.verticalGradient(
                                colors = listOf(ForestGreen, ForestGreen.copy(alpha = 0.8f))
                            )
                        )
                        .padding(24.dp)
                ) {
                    Column {
                        Text(
                            text = "Mon Compte",
                            style = MaterialTheme.typography.titleLarge,
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Personnalisez votre expérience",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White.copy(alpha = 0.8f)
                        )
                    }
                }
            }

            // Language section - Highlighted as it's crucial for Guinea's multilingual context
            item {
                SettingsGroupHeader("Langue et région")

                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    shape = RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.surface,
                    shadowElevation = 2.dp
                ) {
                    SettingsItemModern(
                        icon = Icons.Outlined.Translate,
                        iconBackground = SunsetOrange.copy(alpha = 0.15f),
                        iconTint = SunsetOrange,
                        title = "Langue de l'application",
                        subtitle = currentLanguage.localName,
                        trailing = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = "Modifier",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = SunsetOrange,
                                    fontWeight = FontWeight.Medium
                                )
                                Icon(
                                    imageVector = Icons.Default.ChevronRight,
                                    contentDescription = null,
                                    tint = SunsetOrange,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        },
                        onClick = { showLanguageDialog = true }
                    )
                }
            }

            // Notifications section
            item {
                SettingsGroupHeader("Notifications")

                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.surface,
                    shadowElevation = 2.dp
                ) {
                    Column {
                        SettingsSwitchItemModern(
                            icon = Icons.Outlined.Notifications,
                            iconBackground = MaterialTheme.colorScheme.primaryContainer,
                            title = "Notifications Push",
                            subtitle = "Alertes sur votre téléphone",
                            checked = settings.pushEnabled,
                            onCheckedChange = {
                                onSettingsChange(settings.copy(pushEnabled = it))
                            }
                        )

                        Divider(modifier = Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

                        SettingsSwitchItemModern(
                            icon = Icons.Outlined.Sms,
                            iconBackground = Color(0xFFE3F2FD),
                            iconTint = Color(0xFF1976D2),
                            title = "SMS",
                            subtitle = "Alertes par texte (coûts applicables)",
                            checked = settings.smsEnabled,
                            onCheckedChange = {
                                onSettingsChange(settings.copy(smsEnabled = it))
                            }
                        )

                        Divider(modifier = Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

                        SettingsSwitchItemModern(
                            icon = Icons.Outlined.Campaign,
                            iconBackground = Color(0xFFF3E5F5),
                            iconTint = Color(0xFF7B1FA2),
                            title = "Annonces générales",
                            subtitle = "Nouvelles et mises à jour",
                            checked = settings.notificationsEnabled,
                            onCheckedChange = {
                                onSettingsChange(settings.copy(notificationsEnabled = it))
                            }
                        )
                    }
                }
            }

            // Offline/Data section
            item {
                SettingsGroupHeader("Données et stockage")

                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    shape = RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.surface,
                    shadowElevation = 2.dp
                ) {
                    SettingsSwitchItemModern(
                        icon = Icons.Outlined.DataSaverOn,
                        iconBackground = Color(0xFFE8F5E9),
                        iconTint = Color(0xFF2E7D32),
                        title = "Économie de données",
                        subtitle = "Réduire l'utilisation mobile",
                        checked = settings.offlineMode,
                        onCheckedChange = {
                            onSettingsChange(settings.copy(offlineMode = it))
                        }
                    )
                }
            }

            // About section
            item {
                SettingsGroupHeader("À propos")

                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.surface,
                    shadowElevation = 2.dp
                ) {
                    Column {
                        SettingsItemModern(
                            icon = Icons.Outlined.Info,
                            iconBackground = Color(0xFFFFF3E0),
                            iconTint = Color(0xFFEF6C00),
                            title = "Version",
                            subtitle = "1.0.0 (Build 2026)",
                            onClick = { }
                        )

                        Divider(modifier = Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

                        SettingsItemModern(
                            icon = Icons.Outlined.Description,
                            iconBackground = Color(0xFFE0F2F1),
                            iconTint = Color(0xFF00695C),
                            title = "Conditions d'utilisation",
                            subtitle = "Termes légaux",
                            onClick = { }
                        )

                        Divider(modifier = Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

                        SettingsItemModern(
                            icon = Icons.Outlined.PrivacyTip,
                            iconBackground = Color(0xFFFCE4EC),
                            iconTint = Color(0xFFC2185B),
                            title = "Confidentialité",
                            subtitle = "Protection des données",
                            onClick = { }
                        )

                        Divider(modifier = Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

                        SettingsItemModern(
                            icon = Icons.Outlined.HelpOutline,
                            iconBackground = Color(0xFFE8EAF6),
                            iconTint = Color(0xFF303F9F),
                            title = "Aide & Support",
                            subtitle = "FAQ et contact",
                            onClick = { }
                        )
                    }
                }
            }

            // Logout section - Destructive action clearly separated
            item {
                Spacer(modifier = Modifier.height(16.dp))

                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f),
                    border = BorderStroke(
                        width = 1.dp,
                        color = MaterialTheme.colorScheme.error.copy(alpha = 0.3f)
                    )
                ) {
                    SettingsItemModern(
                        icon = Icons.Outlined.Logout,
                        iconBackground = MaterialTheme.colorScheme.error.copy(alpha = 0.1f),
                        iconTint = MaterialTheme.colorScheme.error,
                        title = "Se déconnecter",
                        subtitle = "Quitter l'application sécuritairement",
                        onClick = { showLogoutDialog = true }
                    )
                }
            }

            // Footer with branding
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Logo placeholder with organic shape
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                            .background(ForestGreen),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "E",
                            style = MaterialTheme.typography.headlineMedium,
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "Eduguinée",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = ForestGreen
                    )

                    Text(
                        text = "Gestion Scolaire Intelligente",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = "© 2026 • Conçu pour la Guinée",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                    )
                }
            }
        }
    }

    // Language selection dialog - Modernized
    if (showLanguageDialog) {
        AlertDialog(
            onDismissRequest = { showLanguageDialog = false },
            containerColor = MaterialTheme.colorScheme.surface,
            shape = RoundedCornerShape(24.dp),
            title = {
                Text(
                    "Choisir la langue",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column {
                    languages.forEachIndexed { index, language ->
                        val selected = language.code == currentLanguage.code

                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .clickable {
                                    onSettingsChange(settings.copy(language = language.code))
                                    showLanguageDialog = false
                                },
                            color = if (selected)
                                MaterialTheme.colorScheme.primaryContainer
                            else
                                MaterialTheme.colorScheme.surface,
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                RadioButton(
                                    selected = selected,
                                    onClick = {
                                        onSettingsChange(settings.copy(language = language.code))
                                        showLanguageDialog = false
                                    },
                                    colors = RadioButtonDefaults.colors(
                                        selectedColor = MaterialTheme.colorScheme.primary
                                    )
                                )

                                Spacer(modifier = Modifier.width(12.dp))

                                Column {
                                    Text(
                                        text = language.localName,
                                        style = MaterialTheme.typography.bodyLarge,
                                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                                        color = if (selected)
                                            MaterialTheme.colorScheme.onPrimaryContainer
                                        else
                                            MaterialTheme.colorScheme.onSurface
                                    )
                                    Text(
                                        text = language.frenchName,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }

                                if (selected) {
                                    Spacer(modifier = Modifier.weight(1f))
                                    Icon(
                                        imageVector = Icons.Default.Check,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }
                        }

                        if (index < languages.size - 1) {
                            Divider(
                                modifier = Modifier.padding(start = 56.dp),
                                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f)
                            )
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(
                    onClick = { showLanguageDialog = false },
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = MaterialTheme.colorScheme.primary
                    )
                ) {
                    Text("Fermer")
                }
            }
        )
    }

    // Logout confirmation dialog - Modernized with icon
    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            icon = {
                Icon(
                    Icons.Default.Logout,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.error,
                    modifier = Modifier.size(32.dp)
                )
            },
            title = {
                Text(
                    "Déconnexion",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Text(
                    "Êtes-vous sûr de vouloir vous déconnecter de votre compte ?",
                    style = MaterialTheme.typography.bodyMedium
                )
            },
            containerColor = MaterialTheme.colorScheme.surface,
            shape = RoundedCornerShape(24.dp),
            confirmButton = {
                Button(
                    onClick = {
                        showLogoutDialog = false
                        onLogout()
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Déconnexion")
                }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = { showLogoutDialog = false },
                    shape = RoundedCornerShape(12.dp),
                    border = ButtonDefaults.outlinedButtonBorder.copy(
                        width = 1.dp
                    )
                ) {
                    Text("Annuler")
                }
            }
        )
    }
}

@Composable
private fun SettingsGroupHeader(title: String) {
    Text(
        text = title.uppercase(),
        style = MaterialTheme.typography.labelMedium,
        color = MaterialTheme.colorScheme.primary,
        fontWeight = FontWeight.Bold,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 12.dp)
    )
}

@Composable
fun SettingsItemModern(
    icon: ImageVector,
    iconBackground: Color,
    iconTint: Color,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
    trailing: @Composable (() -> Unit)? = null
) {
    var pressed by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.98f else 1f,
        animationSpec = tween(100),
        label = "scale"
    )

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(
                onClick = onClick,
                onPressed = { pressed = it }
            )
            .padding(16.dp)
            .scale(scale),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Icon with background
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(iconBackground),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = iconTint,
                modifier = Modifier.size(24.dp)
            )
        }

        Spacer(modifier = Modifier.width(16.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        if (trailing != null) {
            trailing()
        } else {
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f),
                modifier = Modifier.size(24.dp)
            )
        }
    }
}

@Composable
fun SettingsSwitchItemModern(
    icon: ImageVector,
    iconBackground: Color,
    iconTint: Color = MaterialTheme.colorScheme.primary,
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(iconBackground),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = iconTint,
                modifier = Modifier.size(24.dp)
            )
        }

        Spacer(modifier = Modifier.width(16.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = MaterialTheme.colorScheme.primary,
                checkedTrackColor = MaterialTheme.colorScheme.primaryContainer
            )
        )
    }
}

// Extension pour clickable avec état pressed
@Composable
private fun Modifier.clickable(
    onClick: () -> Unit,
    onPressed: (Boolean) -> Unit
): Modifier = this.clickable(
    interactionSource = remember { MutableInteractionSource() },
    indication = null,
    onClick = onClick
)

data class Language(
    val code: String,
    val localName: String,
    val frenchName: String
)