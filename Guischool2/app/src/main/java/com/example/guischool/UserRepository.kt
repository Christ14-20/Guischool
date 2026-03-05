package com.example.guischool



import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

class Counter : ViewModel() {

    // Valeur interne mutable
    private val _count = MutableStateFlow(0)

    // Valeur publique immuable (observée par la View)
    val count = _count.asStateFlow()

    fun increment() {
        _count.value++
    }

    fun decrement() {
        _count.value--
    }
}
